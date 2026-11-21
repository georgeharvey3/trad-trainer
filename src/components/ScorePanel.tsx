import { useState, type ComponentProps } from "react";
import { AbcPlayer } from "./AbcPlayer";
import { copy } from "../copy";

/**
 * Collapsed-by-default notation and playback for the practice card.
 * Styled like the reference video bar. Hiding the score stops its playback.
 * Remount via `key` when the tune changes, so a new tune starts collapsed.
 */
export function ScorePanel(props: ComponentProps<typeof AbcPlayer>) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="ref-block">
        <button className="ref-bar" onClick={() => setOpen(true)}>
          <span className="ref-thumb" aria-hidden="true">
            &#9835;
          </span>
          <span className="ref-bar-main">
            <span className="ref-bt">{copy.scorePanel.title}</span>
            <span className="ref-bs">{copy.scorePanel.subtitle}</span>
          </span>
          <span className="ref-chev">{copy.scorePanel.show} &#9656;</span>
        </button>
      </div>
    );
  }

  return (
    <div className="ref-block">
      <div className="ref-head">
        <span className="ref-label">{copy.scorePanel.label}</span>
        <button className="ref-collapse" onClick={() => setOpen(false)}>
          {copy.scorePanel.hide}
        </button>
      </div>
      <AbcPlayer {...props} />
    </div>
  );
}
