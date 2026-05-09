// 与 public/logo.svg 保持一致
export const GooseLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    className={className}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 20v-4c0-1.5-1-3-3-3H5c-1 0-2-1-2-2V8c0-2 2-3 4-3h2c2 0 4 2 4 4v1c0 2 2 3 4 3h2c1 0 2 1 2 2v2c0 1.5-1 3-3 3h-2" />
    <circle cx="9" cy="8" r="1.5" fill="currentColor" stroke="none" />
    <path d="M16 16l2 2-2 2" />
  </svg>
);
