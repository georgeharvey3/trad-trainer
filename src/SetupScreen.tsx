/** Shown when Supabase env vars are missing — a friendly setup guide. */
export function SetupScreen() {
  return (
    <div className="auth">
      <div>
        <div className="wordmark">Trad Trainer</div>
        <div className="auth-rule" />
        <p className="lede mt-md">Almost there — connect your Supabase project.</p>
        <ol className="setup-steps">
          <li>
            Create a project at <code>supabase.com</code>.
          </li>
          <li>
            Run each file in <code>supabase/migrations/</code>, in order, in the SQL editor.
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
