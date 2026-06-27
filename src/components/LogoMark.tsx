export function LogoMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="3" y="11" width="3" height="6" rx="1" fill="currentColor" />
      <rect x="8.5" y="7" width="3" height="10" rx="1" fill="currentColor" />
      <rect x="14" y="4" width="3" height="13" rx="1" fill="currentColor" />
    </svg>
  );
}
