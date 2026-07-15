import { useState } from "react";
import { useSettings, useUpdateSettings } from "../hooks/useSettings";
import { useTunes } from "../hooks/useTunes";
import { useAuth } from "../auth/AuthProvider";
import { TUNE_TYPES, type Settings as SettingsType, type Tune } from "../lib/types";
import { todayStr } from "../lib/dates";

export function Settings() {
  const settingsQ = useSettings();
  if (settingsQ.isLoading || !settingsQ.data) {
    return <div className="center-note">Loading&hellip;</div>;
  }
  // Remount the form once when settings load, initialising from server data.
  return <SettingsForm initial={settingsQ.data} />;
}

function SettingsForm({ initial }: { initial: SettingsType }) {
  const { user } = useAuth();
  const updateSettings = useUpdateSettings();
  const tunesQ = useTunes();
  const [local, setLocal] = useState<SettingsType>(initial);

  function commit(next: SettingsType) {
    setLocal(next);
    updateSettings.mutate(next);
  }

  function exportBackup() {
    const payload = {
      exportedAt: new Date().toISOString(),
      settings: local,
      tunes: (tunesQ.data ?? []) as Tune[],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `trad-trainer-backup-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <div className="set-group">
        <h3>Account</h3>
        <div className="set-row">
          <label>Signed in as</label>
          <span style={{ color: "var(--muted)", fontSize: 14 }}>{user?.email}</span>
        </div>
        <div className="set-note">
          Your tunes, progress, and recordings sync to this account across devices.
        </div>
      </div>

      <div className="set-group">
        <h3>Practice</h3>
        <div className="set-row">
          <label>Daily tune cap</label>
          <input
            type="number"
            min={1}
            max={200}
            value={local.dailyCap}
            onChange={(e) =>
              commit({ ...local, dailyCap: Math.max(1, parseInt(e.target.value, 10) || 10) })
            }
          />
        </div>
        <div className="set-note">
          At most this many distinct tunes are served per day; the rest of the due queue carries over.
        </div>
      </div>

      <div className="set-group">
        <h3>Target tempos (BPM ceiling per type)</h3>
        {TUNE_TYPES.map((t) => (
          <div className="set-row" key={t}>
            <label>{t}</label>
            <input
              type="number"
              min={40}
              max={300}
              value={local.targets[t] ?? 200}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (v >= 40 && v <= 300) {
                  commit({ ...local, targets: { ...local.targets, [t]: v } });
                }
              }}
            />
          </div>
        ))}
        <div className="set-note">
          Grades nudge each tune's tempo: Easy +4, Good +2, Hard 0, Again &minus;8 &mdash; never above
          the type's target.
        </div>
      </div>

      <div className="set-group">
        <h3>Data</h3>
        <button className="big-btn secondary" style={{ marginTop: 0 }} onClick={exportBackup}>
          Export backup (JSON)
        </button>
        <div className="set-note">
          Exports your tunes and settings as a JSON file. Audio recordings are stored in the cloud
          and are not included in this file.
        </div>
      </div>
    </>
  );
}
