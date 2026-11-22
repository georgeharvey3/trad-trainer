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
    // abcjs listens for touch and mouse, and a phone follows each tap with a
    // copy mouse event, so one tap would pick twice. Skip the mouse copy.
    let lastTouch = -Infinity;
    const visual = abcjs.renderAbc(ref.current, abc, {
      responsive: "resize",
      add_classes: true,
      paddingleft: 0,
      paddingright: 0,
      // abcjs passes the browser event as a sixth argument its types leave out.
      clickListener: ((el: unknown, ...rest: unknown[]) => {
        const ev = rest[4];
        const mouse = (ev as { type?: string } | undefined)?.type?.startsWith("mouse");
        if (!mouse) lastTouch = performance.now();
        else if (performance.now() - lastTouch < 1000) return;
        const start = (el as unknown as { startChar?: number }).startChar;
        if (typeof start === "number") cb.current.onPick?.(start);
      }) as abcjs.ClickListener,
    })[0];
    cb.current.onRendered?.(visual);
  }, [abc]);

  return <div ref={ref} className={`abc-paper${onPick ? " pickable" : ""}`} role="img" aria-label={label} />;
}
