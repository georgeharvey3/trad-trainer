import { useEffect, useLayoutEffect, useRef } from "react";
import * as abcjs from "abcjs";

interface Props {
  /** A full ABC tune (header and body). */
  abc: string;
  /** Called with the drawn tune each time it is drawn. */
  onRendered?: (visual: abcjs.TuneObject) => void;
  /** Called with the ABC character a tap landed on. Makes the score tappable. */
  onPick?: (startChar: number) => void;
  label: string;
}

/** Draws an ABC tune as sheet music that fills its width. */
export function AbcScore({ abc, onRendered, onPick, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // Latest callbacks, so a new closure doesn't redraw the score.
  const cb = useRef({ onRendered, onPick });
  useLayoutEffect(() => {
    cb.current = { onRendered, onPick };
  });

  useEffect(() => {
    if (!ref.current) return;
    const visual = abcjs.renderAbc(ref.current, abc, {
      responsive: "resize",
      add_classes: true,
      paddingleft: 0,
      paddingright: 0,
      clickListener: (el) => {
        const start = (el as unknown as { startChar?: number }).startChar;
        if (typeof start === "number") cb.current.onPick?.(start);
      },
    })[0];
    cb.current.onRendered?.(visual);
  }, [abc]);

  return <div ref={ref} className={`abc-paper${onPick ? " pickable" : ""}`} role="img" aria-label={label} />;
}
