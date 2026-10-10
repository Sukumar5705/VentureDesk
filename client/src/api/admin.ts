import { get, patch } from './client';
import type { Opportunity, PaginationMeta } from './opportunities';

export async function adminListOpportunities(status = 'pending_review', page = 1, limit = 20) {
  const body = await get<{ data: Opportunity[]; pagination: PaginationMeta }>(
    `/api/admin/opportunities?status=${status}&page=${page}&limit=${limit}`
  );
  return body; // { data: Opportunity[], pagination: {...} }
}

export async function adminGetOpportunity(id: string) {
  const body = await get<{ data: Opportunity }>(`/api/admin/opportunities/${id}`);
  return body.data;
}

export async function reviewOpportunity(id: string, decision: string, reviewNote?: string) {
  const body = await patch<{ data: Opportunity }>(`/api/admin/opportunities/${id}/review`, {
    decision,
    ...(reviewNote !== undefined && { reviewNote }),
  });
  return body.data;
}
