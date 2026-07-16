# Design — Trad Trainer

A locked design system for this app. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

The register: a well-used tune book. Warm paper, serif tune titles, hairline
ledgers, functional motion. The app should feel like O'Neill's with a metronome
in the spine — not a SaaS dashboard.

## Genre

editorial

## Macrostructure family

- App pages (Practice · Tunes · Settings): **Workbench** — one focused
  single-column work surface per tab. Practice is the bench (the tune card);
  Tunes is a ledger index; Settings is a form document. Variation knob:
  the work-surface archetype (instrument panel / ledger / document), never
  the theme.
- Auth / setup screens: **Letter** — a single centred card, typeset, quiet.
- Marketing pages: none exist. If one is ever added, amend this file first.

## Theme — Almanac (light + dark from the same anchors)

Anchor hues: warm oat (90) for paper/neutrals, pine green (150–155) for ink
and accent. Dark scheme moves lightness and chroma only, never hue.

Light (default):

- `--color-paper`      oklch(96% 0.013 90)
- `--color-paper-2`    oklch(93.5% 0.015 90)
- `--color-paper-3`    oklch(90% 0.016 90)
- `--color-rule`       oklch(84% 0.015 90)   — decorative hairlines
- `--color-rule-2`     oklch(64% 0.02 95)    — interactive boundaries (≥3:1 on paper)
- `--color-muted`      oklch(44% 0.02 120)   — secondary text
- `--color-ink`        oklch(23% 0.03 150)   — deep pine ink
- `--color-accent`     oklch(45% 0.11 155)   — bottle green
- `--color-accent-ink` oklch(97% 0.015 155)
- `--color-focus`      oklch(50% 0.13 155)

Dark (`prefers-color-scheme: dark`):

- paper 17% / paper-2 20.5% / paper-3 24% / rule 32% / rule-2 46% (hue 90)
- muted oklch(72% 0.02 100) · ink oklch(93% 0.012 100)
- accent oklch(70% 0.10 155) · accent-ink oklch(18% 0.05 155) · focus oklch(74% 0.12 155)

Grade hues (functional colour-coding, always paired with a text label —
never colour alone): again = rust (30), hard = ochre (65–80), good = pine
(155), easy = slate blue (235). Rendered as tinted chips (tint background +
hue border + dark hue text), never saturated full fills.

## Typography

- Display: **Fraunces** (variable, opsz auto), weight 600, style normal —
  wordmark, tune titles, screen headings. Roman only; italic headers are banned.
- Body: **IBM Plex Sans**, 400 (600–700 for emphasis) — all UI text.
- Mono (outlier): **IBM Plex Mono**, 500–600 — exactly one role: **numerals of
  the practice ledger** (the big BPM readout, tempo figures in the tune list,
  numeric entry fields). Never for labels or prose.
- Small-caps labels: uppercase, `letter-spacing: 0.09em`, 11px, muted.
- Tabular numerals (`font-variant-numeric: tabular-nums`) on every data figure.
- Type scale is deliberately tight (app UI): 11 / 13 / 15 / 17 / 20 /
  clamp-display. No more than five sizes per screen.

## Spacing

4-point named scale, in `src/tokens.css` (`--space-3xs` … `--space-3xl`).
Pages must use named tokens (`var(--space-md)`), never raw values.

## Motion

Almanac multiplier 0.85× — functional, like a reference book.

- Easings: `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)` ·
  `--ease-in: cubic-bezier(0.7, 0, 0.84, 0)` ·
  `--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)`
- Durations: `--dur-micro: 100ms` · `--dur-short: 190ms` · `--dur-long: 360ms`
- Allowed primitives (max three per screen): beat-dot pulse (functional
  metronome feedback), modal sheet-rise, button press. No scroll reveals,
  no hover lifts on cards, no loops except the recording blink.
- Reduced-motion: spatial motion collapses to ≤150ms opacity; the beat dots
  keep their state change (functional) without the scale transform.
- Focus rings appear instantly. Never animated.

## Microinteractions stance

- Silent success — saving a tune, grading, saving settings show no toast.
- Errors always get visible text (`.msg.error`, `.rec-status`), never colour alone.
- Hover states only inside `@media (hover: hover)`.
- Hit targets ≥ 44px on all touch controls.

## CTA voice

- Primary action: **ink-filled** rectangle (`--color-ink` bg, paper text),
  weight 600, radius `--radius-input`. The accent is not a button fill.
- Secondary action: 1px `--color-rule-2` outline on paper.
- Destructive: rust outline + rust text; confirm only for irreversible deletes.
- Accent usage: active tab tick, links, focus rings, the wordmark square,
  the running-metronome state. ≤ 5% of any viewport.

## What screens MUST share

- The masthead: Fraunces wordmark with the accent square, 3px double rule below.
- The bottom tab bar voice: small-caps labels, accent top-tick on the active tab.
- The palette, both schemes. The 2+1 font roles. The spacing scale.
- Hairline ledgers (border-separated rows) instead of boxed cards.

## What screens MAY differ on

- Work-surface archetype within the Workbench family (instrument panel /
  ledger / document).
- The Practice bench is the one bordered surface in the app (the instrument
  panel earns its frame); everything else is hairlines on paper.

## Per-page allowances

- App pages MUST NOT use enrichment — function carries the page.
- The asterism `* * *` (accent, letter-spaced) is the only ornament, used for
  end-of-queue states.
- No emoji as icons anywhere. Nav tabs are text-only small caps.

## Exports

### tokens.css

Canonical copy lives at `src/tokens.css` — that file is the source of truth
and is imported by `src/index.css`.

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper:  oklch(96% 0.013 90);
  --color-ink:    oklch(23% 0.03 150);
  --color-accent: oklch(45% 0.11 155);
  --font-display: "Fraunces", ui-serif, Georgia, serif;
  --font-body:    "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono:    "IBM Plex Mono", ui-monospace, monospace;
  --spacing-md:   1rem;
  --text-md:      0.9375rem;
  --ease-out:     cubic-bezier(0.16, 1, 0.3, 1);
}
```

### DTCG `tokens.json`

```json
{
  "color": {
    "paper":  { "$value": "oklch(96% 0.013 90)", "$type": "color" },
    "ink":    { "$value": "oklch(23% 0.03 150)", "$type": "color" },
    "accent": { "$value": "oklch(45% 0.11 155)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Fraunces", "$type": "fontFamily" },
    "body":    { "$value": "IBM Plex Sans", "$type": "fontFamily" },
    "mono":    { "$value": "IBM Plex Mono", "$type": "fontFamily" }
  },
  "space": {
    "md": { "$value": "1rem", "$type": "dimension" }
  }
}
```

### shadcn/ui CSS variables

```css
:root {
  --background:         96% 0.013 90;
  --foreground:         23% 0.03 150;
  --primary:            45% 0.11 155;
  --primary-foreground: 97% 0.015 155;
  --muted:              84% 0.015 90;
  --muted-foreground:   44% 0.02 120;
  --border:             84% 0.015 90;
  --input:              64% 0.02 95;
  --ring:               50% 0.13 155;
  --radius:             7px;
}
```
