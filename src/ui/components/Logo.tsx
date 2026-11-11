/** Two boards with a gap between them: the saw kerf. */
export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect className="logo-a" x="2" y="3" width="13" height="26" rx="2.5" />
      <rect className="logo-b" x="18.5" y="3" width="11.5" height="26" rx="2.5" />
      <path className="logo-cut" d="M16.75 1v30" />
    </svg>
  );
}
