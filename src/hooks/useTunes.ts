import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { rowToTune, supabase, tuneToRow, type TuneRow } from "../lib/supabase";
import { freshTuneFields, gradeTune, type NewTuneInput } from "../lib/srs";
import type { Grade, Settings, Tune } from "../lib/types";
import { SEED_TUNES } from "../lib/seed";
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

/** Seed a brand-new account with the starter tune list. No-op if any tune exists. */
export function useSeedIfEmpty() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { count, error: countErr } = await supabase
        .from("tunes")
        .select("id", { count: "exact", head: true });
      if (countErr) throw countErr;
      if ((count ?? 0) > 0) return 0;

      const rows = SEED_TUNES.map((s) => ({
        user_id: user!.id,
        ...tuneToRow(freshTuneFields(s)),
      }));
      const { error } = await supabase.from("tunes").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (inserted) => {
      if (inserted > 0) qc.invalidateQueries({ queryKey: tunesKey(user?.id) });
    },
  });
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
