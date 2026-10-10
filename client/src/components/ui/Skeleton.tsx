interface SkeletonProps {
  height?: string | number;
  width?: string | number;
  borderRadius?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ height = 20, width = '100%', borderRadius = '8px', style }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        height, width, borderRadius,
        background: 'linear-gradient(90deg, #e8e8e8 25%, #f0f0f0 50%, #e8e8e8 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        ...style,
      }}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div style={{ padding: '20px', background: 'var(--vd-card)', borderRadius: 'var(--radius-card)', border: '1px solid var(--vd-border-muted)' }}>
      <Skeleton height={14} width="60%" style={{ marginBottom: 12 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={12} width={i === lines - 1 ? '40%' : '100%'} style={{ marginBottom: 8 }} />
      ))}
    </div>
  );
}
