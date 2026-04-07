export async function apiFetch<T>(
  fetchFn: typeof fetch,
  url: string,
  options?: RequestInit
): Promise<T | null> {
  try {
    const res = await fetchFn(url, options);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(text || `API error ${res.status}`);
    }
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      throw new Error('Invalid JSON response');
    }
  } catch (err: any) {
    console.group('🚨 API REQUEST FAILED');
    console.log('URL:', url);
    console.log('Error:', err);
    console.groupEnd();
    throw err;
  }
}
