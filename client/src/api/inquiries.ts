import { get, patch } from './client';

export interface InvestorInquiry {
  id: string;
  message: string;
  status: string;
  nextStep?: string | null;
  statusUpdatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  opportunity?: {
    id: string; title: string; stage: string; fundingRequired: number;
    startup: { name: string; industry: string; location: string };
  } | null;
}

export interface PaginationMeta { page: number; limit: number; total: number; pages: number; }

export async function listMyInquiries(params?: { page?: number; limit?: number; status?: string }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.status) qs.set('status', params.status);
  const query = qs.toString() ? `?${qs}` : '';
  const body = await get<{ data: InvestorInquiry[]; pagination: PaginationMeta }>(`/api/inquiries/mine${query}`);
  return body; // return full { data, pagination }
}

export async function updateInquiryStatus(id: string, status: string, nextStep?: string) {
  const body = await patch<{ data: { id: string; status: string; nextStep?: string | null } }>(
    `/api/inquiries/${id}/status`,
    { status, ...(nextStep !== undefined && { nextStep }) }
  );
  return body.data;
}
