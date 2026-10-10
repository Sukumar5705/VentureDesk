import { get, post, patch } from './client';

export interface OpportunitySnapshot {
  name: string;
  description?: string;
  industry: string;
  location: string;
  website?: string | null;
}

export interface Opportunity {
  id: string;
  startup?: string;
  title: string;
  stage?: string | null;
  fundingRequired?: number | null;
  description?: string | null;
  useOfFunds?: string | null;
  status: string;
  startupSnapshot?: OpportunitySnapshot | null;
  submittedAt?: string | null;
  reviewNote?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicOpportunity {
  id: string;
  title: string;
  stage: string;
  fundingRequired: number;
  description: string;
  useOfFunds?: string;
  publishedAt?: string | null;
  startup: OpportunitySnapshot;
}

export interface PaginationMeta {
  page: number; limit: number; total: number; pages: number;
}

export const STAGE_VALUES = ['pre_seed','seed','series_a','series_b','series_c_plus','other'] as const;
export const STAGE_LABELS: Record<string, string> = {
  pre_seed: 'Pre-Seed', seed: 'Seed', series_a: 'Series A',
  series_b: 'Series B', series_c_plus: 'Series C+', other: 'Other',
};

export interface PublicListParams {
  page?: number; limit?: number; search?: string;
  industry?: string; stage?: string; location?: string;
  sortBy?: string; order?: string;
}

export async function listPublicOpportunities(params?: PublicListParams) {
  const qs = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') qs.set(k, String(v)); });
  }
  const query = qs.toString() ? `?${qs}` : '';
  const body = await get<{ data: PublicOpportunity[]; pagination: PaginationMeta }>(`/api/opportunities${query}`);
  return body; // body = { data: [...], pagination: {...} }
}

export async function listMyOpportunities(): Promise<Opportunity[]> {
  const body = await get<{ data: Opportunity[] }>('/api/opportunities/mine');
  return body.data ?? [];
}

export async function createOpportunity(data: Partial<Opportunity>): Promise<Opportunity> {
  const body = await post<{ data: Opportunity }>('/api/opportunities', data);
  return body.data;
}

export async function updateOpportunity(id: string, data: Partial<Opportunity>): Promise<Opportunity> {
  const body = await patch<{ data: Opportunity }>(`/api/opportunities/${id}`, data);
  return body.data;
}

export async function submitOpportunity(id: string): Promise<Opportunity> {
  const body = await post<{ data: Opportunity }>(`/api/opportunities/${id}/submit`);
  return body.data;
}

export function createInquiry(opportunityId: string, message: string) {
  return post<{ data: { id: string } }>(`/api/opportunities/${opportunityId}/inquiries`, { message })
    .then(body => body.data);
}
