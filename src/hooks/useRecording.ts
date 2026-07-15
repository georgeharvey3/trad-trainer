import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RECORDINGS_BUCKET, supabase } from "../lib/supabase";
import type { Recording } from "../lib/recorder";
import type { Tune } from "../lib/types";
import { useAuth } from "../auth/AuthProvider";
import { tunesKey, useUpdateTune } from "./useTunes";

function extForMime(mime: string): string {
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

/** A private signed URL for playing back a tune's recording. */
export function useRecordingUrl(path: string | null) {
  return useQuery({
    queryKey: ["recording-url", path],
    enabled: !!path,
    staleTime: 1000 * 60 * 30, // signed URL lives 1h; refetch well before
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase.storage
        .from(RECORDINGS_BUCKET)
        .createSignedUrl(path!, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export function useSaveRecording() {
  const { user } = useAuth();
  const updateTune = useUpdateTune();
  return useMutation({
    mutationFn: async ({ tune, recording }: { tune: Tune; recording: Recording }) => {
      const ext = extForMime(recording.mimeType);
      const path = `${user!.id}/${tune.id}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(RECORDINGS_BUCKET)
        .upload(path, recording.blob, { contentType: recording.mimeType, upsert: true });
      if (upErr) throw upErr;

      // If a previous recording used a different extension, remove the stale object.
      if (tune.recordingPath && tune.recordingPath !== path) {
        await supabase.storage.from(RECORDINGS_BUCKET).remove([tune.recordingPath]);
      }

      await updateTune.mutateAsync({
        id: tune.id,
        patch: { recordingPath: path, recordingDurationMs: recording.durationMs },
      });
      return path;
    },
  });
}

export function useDeleteRecording() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const updateTune = useUpdateTune();
  return useMutation({
    mutationFn: async (tune: Tune) => {
      if (tune.recordingPath) {
        await supabase.storage.from(RECORDINGS_BUCKET).remove([tune.recordingPath]);
      }
      await updateTune.mutateAsync({
        id: tune.id,
        patch: { recordingPath: null, recordingDurationMs: null },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: tunesKey(user?.id) }),
  });
}
