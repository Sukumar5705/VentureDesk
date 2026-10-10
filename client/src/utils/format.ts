// Format INR amounts with Cr/L suffixes
export function formatINR(amount: number | null | undefined): string {
  if (amount == null) return '-';
  if (amount >= 1_00_00_000) {
    const cr = amount / 1_00_00_000;
    return `\u20B9${cr % 1 === 0 ? cr : cr.toFixed(1)} Cr`;
  }
  if (amount >= 1_00_000) {
    const l = amount / 1_00_000;
    return `\u20B9${l % 1 === 0 ? l : l.toFixed(1)} L`;
  }
  return `\u20B9${amount.toLocaleString('en-IN')}`;
}

// Format date as relative or YYYY-MM-DD
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return date.toISOString().slice(0, 10);
}

export function formatDateAbsolute(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  return date.toISOString().slice(0, 10);
}

export function formatDateDMY(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Status colors
export const OPPORTUNITY_STATUS_COLORS: Record<string, string> = {
  draft: 'var(--status-draft)',
  pending_review: 'var(--status-pending)',
  changes_requested: 'var(--status-changes)',
  approved: 'var(--status-approved)',
  rejected: 'var(--status-rejected)',
};

export const OPPORTUNITY_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  changes_requested: 'Changes Requested',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const INQUIRY_STATUS_COLORS: Record<string, string> = {
  new: 'var(--inquiry-new)',
  contacted: 'var(--inquiry-contacted)',
  meeting_scheduled: 'var(--inquiry-meeting)',
  due_diligence: 'var(--inquiry-diligence)',
  closed_won: 'var(--inquiry-won)',
  closed_lost: 'var(--inquiry-lost)',
};

export const INQUIRY_STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  meeting_scheduled: 'Meeting Scheduled',
  due_diligence: 'Due Diligence',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
};

export const INQUIRY_TRANSITIONS: Record<string, string[]> = {
  new: ['contacted', 'closed_lost'],
  contacted: ['meeting_scheduled', 'closed_lost'],
  meeting_scheduled: ['due_diligence', 'closed_lost'],
  due_diligence: ['closed_won', 'closed_lost'],
  closed_won: [],
  closed_lost: [],
};

export function truncate(text: string, max: number): string {
  if (!text) return '';
  return text.length <= max ? text : `${text.slice(0, max)}...`;
}
