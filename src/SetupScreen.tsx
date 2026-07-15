/** Shown when Supabase env vars are missing — a friendly setup guide. */
export function SetupScreen() {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>
          <span className="fiddle">&#127931;</span>Trad Trainer
        </h1>
        <p className="tagline">Almost there — connect your Supabase project.</p>
        <ol style={{ paddingLeft: 18, fontSize: 14, lineHeight: 1.7, color: "var(--text)" }}>
          <li>
            Create a project at <code>supabase.com</code>.
          </li>
          <li>
            Run <code>supabase/migrations/0001_init.sql</code> in the SQL editor.
          </li>
          <li>
            Copy <code>.env.example</code> to <code>.env</code> and fill in your project URL and
            anon key (Project Settings &rarr; API).
          </li>
          <li>Restart the dev server.</li>
        </ol>
      </div>
    </div>
  );
}
