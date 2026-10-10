import { get, post } from './client';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'founder' | 'investor' | 'admin';
  createdAt: string;
}

export async function me(): Promise<User> {
  const body = await get<{ data: User }>('/api/auth/me');
  return body.data;
}

export async function login(email: string, password: string): Promise<User> {
  const body = await post<{ data: User }>('/api/auth/login', { email, password });
  return body.data;
}

export async function register(fullName: string, email: string, password: string, role: 'founder' | 'investor'): Promise<User> {
  const body = await post<{ data: User }>('/api/auth/register', { fullName, email, password, role });
  return body.data;
}

export async function logout(): Promise<void> {
  await post<{ message: string }>('/api/auth/logout');
}
