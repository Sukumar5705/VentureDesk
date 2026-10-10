import React from 'react';

interface MetricCardProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  sub?: string;
  color?: string;
}

export function MetricCard({ label, value, icon, sub, color }: MetricCardProps) {
  return (
    <div
      style={{
        background: 'var(--vd-card-strong)',
        borderRadius: 'var(--radius-metric)',
        padding: '20px 22px',
        border: '1px solid var(--vd-border-muted)',
        boxShadow: 'var(--shadow-card)',
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        transition: 'box-shadow var(--transition-fast)',
      }}
    >
      {/* Header row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
      }}>
        <span style={{
          fontSize: 12.5,
          color: 'var(--vd-text-secondary)',
          fontWeight: 500,
          letterSpacing: '-0.01em',
        }}>
          {label}
        </span>
        {icon && (
          <span style={{
            color: color ?? 'var(--vd-text-secondary)',
            opacity: color ? 0.9 : 0.6,
            display: 'flex',
          }}>
            {icon}
          </span>
        )}
      </div>

      {/* Primary value */}
      <div
        data-metric
        style={{
          fontSize: 36,
          fontWeight: 700,
          color: color ?? 'var(--vd-text)',
          lineHeight: 1,
          letterSpacing: '-0.03em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>

      {/* Supporting label */}
      {sub && (
        <div style={{
          fontSize: 11.5,
          color: 'var(--vd-text-secondary)',
          marginTop: 7,
          letterSpacing: '-0.01em',
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}
