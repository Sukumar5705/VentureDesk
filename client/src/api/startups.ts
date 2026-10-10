import { get, post, patch } from './client';

export interface Startup {
  id: string;
  name: string;
  description: string;
  industry: string;
  location: string;
  website?: string;
  createdAt: string;
  updatedAt: string;
}

export const INDUSTRY_VALUES = [
  'ai_ml','agritech','climate_energy','cybersecurity','ecommerce',
  'edtech','fintech','healthtech','logistics','real_estate','saas','consumer','other'
] as const;

export const INDUSTRY_LABELS: Record<string, string> = {
  ai_ml: 'AI / ML', agritech: 'Agritech', climate_energy: 'Climate & Energy',
  cybersecurity: 'Cybersecurity', ecommerce: 'E-Commerce', edtech: 'EdTech',
  fintech: 'FinTech', healthtech: 'HealthTech', logistics: 'Logistics',
  real_estate: 'Real Estate', saas: 'SaaS', consumer: 'Consumer', other: 'Other',
};

export async function getMyStartup(): Promise<Startup> {
  const body = await get<{ data: Startup }>('/api/startups/me');
  return body.data;
}

export async function createStartup(data: Omit<Startup, 'id' | 'createdAt' | 'updatedAt'>): Promise<Startup> {
  const body = await post<{ data: Startup }>('/api/startups', data);
  return body.data;
}

export async function updateMyStartup(data: Partial<Omit<Startup, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Startup> {
  const body = await patch<{ data: Startup }>('/api/startups/me', data);
  return body.data;
}

export interface Inquiry {
  id: string;
  message: string;
  status: string;
  nextStep?: string | null;
  statusUpdatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  investor?: { id: string; fullName: string } | null;
  opportunity?: { id: string; title: string } | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export async function getStartupInquiries(params?: { page?: number; limit?: number; status?: string }): Promise<{ data: Inquiry[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.status) qs.set('status', params.status);
  const query = qs.toString() ? `?${qs}` : '';
  const body = await get<{ data: Inquiry[]; pagination: { page: number; limit: number; total: number; pages: number } }>(`/api/startups/me/inquiries${query}`);
  return body;
}
