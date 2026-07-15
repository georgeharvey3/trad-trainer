import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { DEFAULT_TARGETS } from "../lib/srs";
import type { Settings } from "../lib/types";
import { useAuth } from "../auth/AuthProvider";

const DEFAULT_SETTINGS: Settings = { dailyCap: 10, targets: { ...DEFAULT_TARGETS } };

function normalize(raw: Partial<Settings> | null | undefined): Settings {
  return {
    dailyCap: raw?.dailyCap ?? DEFAULT_SETTINGS.dailyCap,
    targets: { ...DEFAULT_TARGETS, ...(raw?.targets ?? {}) },
  };
}

export function useSettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["settings", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Settings> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("settings")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return normalize(data?.settings as Partial<Settings> | undefined);
    },
  });
}

export function useUpdateSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (next: Settings) => {
      const { error } = await supabase
        .from("profiles")
        .update({ settings: next })
        .eq("id", user!.id);
      if (error) throw error;
      return next;
    },
    onMutate: async (next) => {
      const key = ["settings", user?.id];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Settings>(key);
      qc.setQueryData(key, next);
      return { prev };
    },
    onError: (_e, _next, ctx) => {
      if (ctx?.prev) qc.setQueryData(["settings", user?.id], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["settings", user?.id] });
    },
  });
}
