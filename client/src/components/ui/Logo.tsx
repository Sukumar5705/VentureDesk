import React from 'react';
import logoAsset from '../../assets/logo.png';

interface LogoProps {
  /** Variant controls context: 'sidebar' (dark bg), 'light' (white surface), 'auth' (centered) */
  variant?: 'sidebar' | 'light' | 'auth';
  size?: 'sm' | 'md' | 'lg';
  hideText?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const sizeMap = {
  sm: { height: 28, text: 14 },
  md: { height: 34, text: 16 },
  lg: { height: 40, text: 20 },
};

export function Logo({
  variant = 'light',
  size = 'md',
  hideText = false,
  className,
  style,
}: LogoProps) {
  const s = sizeMap[size];

  const isDark = variant === 'sidebar';
  const textColor = isDark ? '#EEF0F1' : '#0F1417';

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'lg' ? 12 : 9,
        ...style,
      }}
      aria-label="VentureDesk"
    >
      <img
        src={logoAsset}
        alt="VentureDesk Logo"
        style={{
          height: s.height,
          width: 'auto',
          objectFit: 'contain',
          display: 'block'
        }}
      />
      {!hideText && (
        <span
          style={{
            fontSize: s.text,
            fontWeight: 700,
            letterSpacing: '-0.025em',
            color: textColor,
            fontFamily: 'var(--font-sans)',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          VentureDesk
        </span>
      )}
    </span>
  );
}
