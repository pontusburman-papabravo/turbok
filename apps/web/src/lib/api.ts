export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export async function fetchMe(cookieHeader?: string): Promise<AuthUser | null> {
  const headers: HeadersInit = {};
  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  const response = await fetch(`${API_URL}/api/v1/auth/me`, {
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { user: AuthUser };
  return data.user;
}
