import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary:   { background: 'var(--vd-text)',        color: '#fff',              border: '1px solid transparent' },
  secondary: { background: 'var(--vd-card-strong)', color: 'var(--vd-text)',   border: '1px solid var(--vd-border-muted)' },
  ghost:     { background: 'transparent',            color: 'var(--vd-text)',   border: '1px solid transparent' },
  danger:    { background: 'var(--vd-red)',          color: '#fff',              border: '1px solid transparent' },
};

const sizeStyles: Record<string, React.CSSProperties> = {
  sm: { padding: '6px 14px',  fontSize: 12.5, gap: 5 },
  md: { padding: '9px 18px',  fontSize: 13.5, gap: 6 },
  lg: { padding: '12px 24px', fontSize: 14.5, gap: 7 },
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={loading || disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: 'var(--radius-pill)',
        fontWeight: 600,
        fontFamily: 'var(--font-sans)',
        letterSpacing: '-0.01em',
        lineHeight: 1,
        cursor: loading || disabled ? 'not-allowed' : 'pointer',
        transition: 'opacity var(--transition-fast), background var(--transition-fast), box-shadow var(--transition-fast)',
        opacity: loading || disabled ? 0.55 : 1,
        whiteSpace: 'nowrap',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
    >
      {loading && (
        <span
          style={{
            display: 'inline-block',
            width: 11,
            height: 11,
            borderRadius: '50%',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            animation: 'spin 0.6s linear infinite',
            flexShrink: 0,
          }}
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
