// Tiny authored icons, one stroke weight, currentColor. Decorative only.
const base = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };

export function IconDownload() {
  return (
    <svg {...base}>
      <path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10" />
    </svg>
  );
}

export function IconSwap() {
  return (
    <svg {...base}>
      <path d="M3 5.5h9.5M10 3l2.5 2.5L10 8M13 10.5H3.5M6 8l-2.5 2.5L6 13" />
    </svg>
  );
}

export function IconAlert() {
  return (
    <svg {...base} strokeWidth={2}>
      <path d="M8 3.5v5M8 11.5v.5" />
    </svg>
  );
}

export function IconArrow() {
  return (
    <svg {...base}>
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}
