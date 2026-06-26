import React from 'react';

export function Logo({ className, style }: { className?: string; style?: React.CSSProperties }) {
  // A clean outline of a car front, right side only, with headlight near center (cx=32 on 64px grid)
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      {/* Headlight directly in the middle line */}
      <circle cx="32" cy="40" r="4" />
      <path d="M 36 40 L 46 38" />
      {/* Hood line extending to right */}
      <path d="M 32 30 C 42 30, 48 34, 52 38" />
      {/* Windshield */}
      <path d="M 32 18 C 40 18, 48 26, 52 38" />
      {/* Roof */}
      <path d="M 32 16 L 38 16" />
      {/* Grill and Bumper */}
      <path d="M 32 48 L 46 48 C 50 48, 52 44, 52 38" />
      <path d="M 32 54 L 48 54 C 54 54, 56 48, 56 42 L 52 38" />
      {/* Wheel indicator */}
      <path d="M 48 54 L 48 60 L 56 60 L 56 46" />
    </svg>
  );
}
