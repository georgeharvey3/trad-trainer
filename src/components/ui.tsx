/** Small shared controls: sheet, stepper, switch, progress ring, bar strip. */
import { useEffect, useRef, type ReactNode } from "react";
import { MinusIcon, PlusIcon } from "./Icons";

/**
 * A bottom sheet over a shade. Escape and a tap on the shade close it. Focus
 * moves into the sheet when it opens and back where it was when it closes.
 */
export function Sheet({
  label,
  onClose,
  children,
  full = false,
  role = "dialog",
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  full?: boolean;
  role?: "dialog" | "alertdialog";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      before?.focus?.();
    };
  }, [onClose]);
  return (
    <>
      <div className="shade" onClick={onClose} />
      <div
        ref={ref}
        className={`sheet${full ? " full" : ""}`}
        role={role}
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
      >
        {!full && <div className="grabber" aria-hidden="true" />}
        {children}
      </div>
    </>
  );
}

export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  /** What the number is, for screen readers: "Daily limit". */
  label: string;
}) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button
        type="button"
        aria-label={`Lower ${label.toLowerCase()}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
      >
        <MinusIcon />
      </button>
      <span className="val" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label={`Raise ${label.toLowerCase()}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
      >
        <PlusIcon size={16} />
      </button>
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="switch"
      onClick={() => onChange(!checked)}
    />
  );
}

/** A ring that fills with `done / total`. Shows the fraction inside when `showText`. */
export function Ring({ done, total, small = false }: { done: number; total: number; small?: boolean }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const frac = total > 0 ? Math.min(1, done / total) : 0;
  return (
    <svg className={`ring${small ? " sm" : ""}`} viewBox="0 0 52 52" role="img" aria-label={`${done} of ${total} bars learnt`}>
      <circle cx="26" cy="26" r={r} fill="none" stroke="var(--color-rule)" strokeWidth={small ? 5 : 4} />
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={small ? 5 : 4}
        strokeLinecap="round"
        strokeDasharray={`${Math.max(frac * c, frac > 0 ? 4 : 0)} ${c}`}
        transform="rotate(-90 26 26)"
      />
      {!small && total > 0 && (
        <text
          x="26"
          y="30"
          textAnchor="middle"
          fontFamily="IBM Plex Mono, monospace"
          fontWeight={600}
          fontSize={total >= 10 ? 11 : 12}
          fill="var(--color-ink)"
        >
          {done}/{total}
        </text>
      )}
    </svg>
  );
}

/** One cell per bar: learnt bars filled, the looped bars outlined. */
export function BarStrip({ total, learnt, sel }: { total: number; learnt: number[]; sel?: { from: number; to: number } | null }) {
  const set = new Set(learnt);
  return (
    <div className="barstrip" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const inSel = sel && n >= sel.from && n <= sel.to;
        return <i key={n} className={`${set.has(n) ? "learnt" : ""}${inSel ? " sel" : ""}`} />;
      })}
    </div>
  );
}
