
export function Logo({ size = 28 }: { size?: number; }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="NSI-PMF">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1F7AE0" />
          <stop offset="100%" stopColor="#59A3FF" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" ry="14" fill="url(#g)" />
      <path d="M18 40 L32 20 L46 40" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="32" cy="40" r="3" fill="white" />
    </svg>
  );
}
