export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('groceRealToken');
};

export const setToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('groceRealToken', token);
  }
};

export const clearToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('groceRealToken');
  }
};

export const apiFetch = async <T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  };

  const token = getToken();
  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${base}${url}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `Request failed ${res.status}`);
  }
  return res.json();
};
