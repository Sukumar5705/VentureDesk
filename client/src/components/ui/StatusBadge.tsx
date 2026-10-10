import { OPPORTUNITY_STATUS_COLORS, OPPORTUNITY_STATUS_LABELS, INQUIRY_STATUS_COLORS, INQUIRY_STATUS_LABELS } from '../../utils/format';

interface StatusBadgeProps {
  status: string;
  type?: 'opportunity' | 'inquiry';
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, type = 'opportunity', size = 'sm' }: StatusBadgeProps) {
  const colors = type === 'inquiry' ? INQUIRY_STATUS_COLORS : OPPORTUNITY_STATUS_COLORS;
  const labels = type === 'inquiry' ? INQUIRY_STATUS_LABELS : OPPORTUNITY_STATUS_LABELS;
  const color = colors[status] ?? 'var(--status-draft)';
  const label = labels[status] ?? status;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: size === 'sm' ? '3px 10px' : '5px 14px',
      borderRadius: 'var(--radius-pill)',
      fontSize: size === 'sm' ? '11px' : '13px',
      fontWeight: 600,
      background: `${color}22`,
      color: color === 'var(--status-draft)' || color === 'var(--inquiry-new)' ? '#555' : color,
      border: `1px solid ${color}44`,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}
