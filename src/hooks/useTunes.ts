import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  rowToLibraryTune,
  rowToTune,
  supabase,
  tuneToRow,
  type LibraryRow,
  type TuneRow,
} from "../lib/supabase";
import { DEFAULT_BEATS, freshTuneFields, gradeTune, LEARN_TEMPOS, type NewTuneInput } from "../lib/srs";
import type { Grade, LibraryTune, Settings, Tune } from "../lib/types";
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
      const { data, error } = await supabase.from("library").select("*");
      if (error) throw error;
      return (data as LibraryRow[]).map(rowToLibraryTune);
    },
  });
}

/**
 * Input for `useAddTune` that adds a Library tune to the Repertoire. The new
 * row copies the name, type and beats (ADR 0001) and starts at the learn
 * tempo. `freshTuneFields` makes it due today.
 */
export function libraryTuneInput(t: LibraryTune): NewTuneInput {
  return {
    title: t.name,
    type: t.type,
    tempo: LEARN_TEMPOS[t.type] || 100,
    beats: DEFAULT_BEATS[t.type],
    libraryTuneId: t.id,
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

/** Apply an SRS grade to a tune and persist the resulting schedule/tempo. */
export function useGradeTune() {
  const update = useUpdateTune();
  return (tune: Tune, grade: Grade, settings: Settings) => {
    const graded = gradeTune(tune, grade, settings.targets);
    return update.mutateAsync({
      id: tune.id,
      patch: {
        tempo: graded.tempo,
        ease: graded.ease,
        interval: graded.interval,
        reps: graded.reps,
        lapses: graded.lapses,
        due: graded.due,
        lastPracticed: graded.lastPracticed,
      },
    });
  };
}
