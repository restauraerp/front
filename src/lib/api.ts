export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8029/api/v1';

export async function fetchApi(endpoint: string, options: RequestInit = {}, serverToken?: string) {
  let token = serverToken;

  if (!token && typeof document !== 'undefined') {
    // In Client Components, extract token from document.cookie
    const match = document.cookie.match(new RegExp('(^| )token=([^;]+)'));
    if (match) token = match[2];
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    cache: 'no-store',
    ...options,
    headers,
  });

  if (!response.ok) {
    try {
      const errorData = await response.json();
      console.error('API Error Response:', errorData);
    } catch (e) {
      console.error('API Error Response could not be parsed as JSON');
    }
    throw new Error(`API Request Failed: ${response.status} ${response.statusText}`);
  }

  if (response.status === 204) return null;
  return response.json();
}