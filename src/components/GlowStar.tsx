import * as React from "react";

type GlowStarProps = {
  size?: number;
  className?: string;
  title?: string;
};

export function GlowStar({ size = 44, className, title = "Star" }: GlowStarProps) {
  const gradientId = React.useId();
  const glowId = React.useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={gradientId} x1="18" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFD27A" />
          <stop offset="0.55" stopColor="#FFB24E" />
          <stop offset="1" stopColor="#FF8B47" />
        </linearGradient>

        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="
              1 0 0 0 0
              0 0.75 0 0 0
              0 0 0.35 0 0
              0 0 0 0.8 0
            "
            result="warmBlur"
          />
          <feMerge>
            <feMergeNode in="warmBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Soft glow halo */}
      <path
        d="M32 8c2.7 12.2 5.8 15.3 18 18-12.2 2.7-15.3 5.8-18 18-2.7-12.2-5.8-15.3-18-18 12.2-2.7 15.3-5.8 18-18z"
        fill="url(#"  // prevents TS auto-formatting issues
      />
      {/* TS-safe fill assignment */}
      <path
        d="M32 8c2.7 12.2 5.8 15.3 18 18-12.2 2.7-15.3 5.8-18 18-2.7-12.2-5.8-15.3-18-18 12.2-2.7 15.3-5.8 18-18z"
        fill={`url(#${gradientId})`}
        opacity={0.22}
      />

      {/* Main star */}
      <path
        d="M32 10c2.5 11.2 5.3 14 16.5 16.5C37.3 29 34.5 31.8 32 43c-2.5-11.2-5.3-14-16.5-16.5C26.7 24 29.5 21.2 32 10z"
        fill={`url(#${gradientId})`}
        filter={`url(#${glowId})`}
      />

      {/* Small sparkles */}
      <circle cx="50" cy="16" r="2.2" fill="#FFD27A" opacity="0.95" />
      <circle cx="54" cy="24" r="1.4" fill="#FFB24E" opacity="0.85" />
      <circle cx="14" cy="18" r="1.7" fill="#FFD27A" opacity="0.75" />
    </svg>
  );
}

export default GlowStar;