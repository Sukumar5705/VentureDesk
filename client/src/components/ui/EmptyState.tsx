import { SearchX } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '48px 24px', textAlign: 'center', gap: 12,
    }}>
      <div style={{ color: 'var(--vd-text-secondary)', opacity: 0.5 }}>
        {icon ?? <SearchX size={40} />}
      </div>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--vd-text)' }}>{title}</h3>
      {description && <p style={{ margin: 0, fontSize: 14, color: 'var(--vd-text-secondary)', maxWidth: 320 }}>{description}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}
