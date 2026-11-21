/** Inline stroke icons. Decorative: the button around each one carries the label. */
type P = { size?: number };

const stroke = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const PlayIcon = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M8 5.5v13l10.5-6.5z" />
  </svg>
);
export const StopIcon = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" />
  </svg>
);
export const PauseIcon = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="7" y="6" width="3.5" height="12" rx="1" />
    <rect x="13.5" y="6" width="3.5" height="12" rx="1" />
  </svg>
);
export const CloseIcon = ({ size = 20 }: P) => (
  <svg {...stroke(size)} strokeWidth={1.8}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const BackIcon = ({ size = 20 }: P) => (
  <svg {...stroke(size)}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);
export const ChevronIcon = ({ size = 16 }: P) => (
  <svg {...stroke(size)}>
    <path d="M9 5l7 7-7 7" />
  </svg>
);
export const DownIcon = ({ size = 14 }: P) => (
  <svg {...stroke(size)}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
export const PlusIcon = ({ size = 18 }: P) => (
  <svg {...stroke(size)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const MinusIcon = ({ size = 16 }: P) => (
  <svg {...stroke(size)}>
    <path d="M5 12h14" />
  </svg>
);
export const CheckIcon = ({ size = 16 }: P) => (
  <svg {...stroke(size)} strokeWidth={2.4}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
export const SearchIcon = ({ size = 18 }: P) => (
  <svg {...stroke(size)} strokeWidth={1.8}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </svg>
);
export const NotesIcon = ({ size = 15 }: P) => (
  <svg {...stroke(size)}>
    <path d="M9 18V6l10-2v12" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="16.5" cy="16" r="2.5" />
  </svg>
);
export const VideoIcon = ({ size = 15 }: P) => (
  <svg {...stroke(size)}>
    <rect x="3" y="6" width="13" height="12" rx="2" />
    <path d="M16 10l5-3v10l-5-3" />
  </svg>
);
export const LoopIcon = ({ size = 14 }: P) => (
  <svg {...stroke(size)}>
    <path d="M17 2l4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </svg>
);
export const DownloadIcon = ({ size = 18 }: P) => (
  <svg {...stroke(size)}>
    <path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14" />
  </svg>
);
export const BookIcon = ({ size = 24 }: P) => (
  <svg {...stroke(size)}>
    <path d="M4 19.5V5a1 1 0 0 1 1-1h6v15H5a1 1 0 0 0-1 1zM20 19.5V5a1 1 0 0 0-1-1h-6v15h6a1 1 0 0 1 1 1z" />
  </svg>
);
export const AlertIcon = ({ size = 18 }: P) => (
  <svg {...stroke(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5v.01" />
  </svg>
);
export const SunIcon = ({ size = 14 }: P) => (
  <svg {...stroke(size)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
  </svg>
);
export const MailIcon = ({ size = 44 }: P) => (
  <svg {...stroke(size)} strokeWidth={1.4}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="M3.5 7l8.5 6 8.5-6" />
  </svg>
);
