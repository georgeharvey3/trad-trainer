import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  rowToLibraryTune,
  rowToReview,
  rowToTune,
  supabase,
  tuneToRow,
  type LibraryRow,
  type ReviewRow,
  type TuneRow,
} from "../lib/supabase";
import { DEFAULT_BEATS, freshTuneFields, gradeTune, LEARN_TEMPOS, type NewTuneInput } from "../lib/srs";
import { addDays, todayStr } from "../lib/dates";
import type { Grade, LibraryTune, Review, SessionResult, Settings, Stage, Tune } from "../lib/types";
import { useAuth } from "../auth/AuthProvider";

export function tunesKey(userId: string | undefined) {
  return ["tunes", userId] as const;
}

export function useTunes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: tunesKey(user?.id),
    enabled: !!user,
    queryFn: async (): Promise<Tune[]> => {
      const { data, error } = await supabase
        .from("tunes")
        .select("*")
        .order("title", { ascending: true });
      if (error) throw error;
      return (data as TuneRow[]).map(rowToTune);
    },
  });
}

/** The Library: the shared list of tunes from The Session. */
export function useLibrary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["library"],
    enabled: !!user,
    staleTime: Infinity,
    queryFn: async (): Promise<LibraryTune[]> => {
      // The list leaves out `abc` (about 1 KB a tune). Playback reads it per tune.
      const { data, error } = await supabase.from("library").select("id, session_id, name, type, key, tunebooks");
      if (error) throw error;
      return (data as LibraryRow[]).map(rowToLibraryTune);
    },
  });
}

/** One Library tune with its `abc`, read when the user opens its player. */
export function useLibraryTune(id: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["library-tune", id],
    enabled: !!user && !!id,
    staleTime: Infinity,
    queryFn: async (): Promise<LibraryTune> => {
      const { data, error } = await supabase
        .from("library")
        .select("id, session_id, name, type, key, tunebooks, abc")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return rowToLibraryTune(data as LibraryRow);
    },
  });
}

/**
 * Input for `useAddTune` that adds a Library tune to the Repertoire. The new
 * row copies the name, type and beats (ADR 0001) and starts at the learn
 * tempo. `freshTuneFields` makes it due today.
 */
export function libraryTuneInput(t: LibraryTune, stage: Stage = "rotation"): NewTuneInput {
  return {
    title: t.name,
    type: t.type,
    tempo: LEARN_TEMPOS[t.type] || 100,
    beats: DEFAULT_BEATS[t.type],
    libraryTuneId: t.id,
    stage,
  };
}

export function useAddTune() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewTuneInput) => {
      const { data, error } = await supabase
        .from("tunes")
        .insert({ user_id: user!.id, ...tuneToRow(freshTuneFields(input)) })
        .select("*")
        .single();
      if (error) throw error;
      return rowToTune(data as TuneRow);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: tunesKey(user?.id) }),
  });
}

export function useUpdateTune() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Tune> }) => {
      const { data, error } = await supabase
        .from("tunes")
        .update(tuneToRow(patch))
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return rowToTune(data as TuneRow);
    },
    onMutate: async ({ id, patch }) => {
      const key = tunesKey(user?.id);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Tune[]>(key);
      if (prev) {
        qc.setQueryData(
          key,
          prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        );
      }
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(tunesKey(user?.id), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: tunesKey(user?.id) }),
  });
}

export function useDeleteTune() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tunes").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: tunesKey(user?.id) }),
  });
}

export function reviewsKey(userId: string | undefined) {
  return ["reviews", userId] as const;
}

/** How far back the app reads reviews: enough for the calendar and the charts. */
const REVIEW_HISTORY_DAYS = 400;

/** The user's reviews of the last `REVIEW_HISTORY_DAYS` days, oldest first. */
export function useReviews() {
  const { user } = useAuth();
  return useQuery({
    queryKey: reviewsKey(user?.id),
    enabled: !!user,
    queryFn: async (): Promise<Review[]> => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, user_id, tune_id, grade, tempo_before, tempo_after, reviewed_on, created_at")
        .gte("reviewed_on", addDays(todayStr(), -REVIEW_HISTORY_DAYS))
        .order("created_at", { ascending: true });
      // Before migration 0006 there is no table: show no history, don't fail.
      if (error) return [];
      return (data as ReviewRow[]).map(rowToReview);
    },
  });
}

/** The SRS fields a grade changes. Kept so "Undo" can put them back. */
type ScheduleFields = Pick<Tune, "tempo" | "ease" | "interval" | "reps" | "lapses" | "due" | "lastPracticed">;

function scheduleOf(t: Tune): ScheduleFields {
  return {
    tempo: t.tempo,
    ease: t.ease,
    interval: t.interval,
    reps: t.reps,
    lapses: t.lapses,
    due: t.due,
    lastPracticed: t.lastPracticed,
  };
}

/** What a grade did, with what it needs to be undone. */
export interface GradeOutcome extends SessionResult {
  before: ScheduleFields;
  /** The id of the logged review, or null when it could not be logged. */
  reviewId: string | null;
}

/**
 * Apply an SRS grade to a tune, persist the new schedule and tempo, and log a
 * review. The schedule is the source of truth: a failed review log does not
 * fail the grade.
 */
export function useGradeTune() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const update = useUpdateTune();
  return async (tune: Tune, grade: Grade, settings: Settings): Promise<GradeOutcome> => {
    const graded = gradeTune(tune, grade, settings.targets);
    const before = scheduleOf(tune);
    const outcome: GradeOutcome = {
      tuneId: tune.id,
      grade,
      tempoBefore: tune.tempo,
      tempoAfter: graded.tempo,
      due: graded.due,
      before,
      reviewId: null,
    };
    const persist = update.mutateAsync({ id: tune.id, patch: scheduleOf(graded) });
    const { data } = await supabase
      .from("reviews")
      .insert({
        user_id: user!.id,
        tune_id: tune.id,
        grade,
        tempo_before: tune.tempo,
        tempo_after: graded.tempo,
        reviewed_on: todayStr(),
      })
      .select("id")
      .single();
    outcome.reviewId = (data as { id: string } | null)?.id ?? null;
    void qc.invalidateQueries({ queryKey: reviewsKey(user?.id) });
    await persist;
    return outcome;
  };
}

/** Take back a grade: restore the schedule and remove its review. */
export function useUndoGrade() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const update = useUpdateTune();
  return async (outcome: GradeOutcome) => {
    await update.mutateAsync({ id: outcome.tuneId, patch: outcome.before });
    if (outcome.reviewId) {
      await supabase.from("reviews").delete().eq("id", outcome.reviewId);
      void qc.invalidateQueries({ queryKey: reviewsKey(user?.id) });
    }
  };
}
