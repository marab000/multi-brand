export async function apiFetch<T>(
  fetchFn: typeof fetch,
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const res = await fetchFn(url, options);

    if (!res.ok) {
      let text = '';
      try {
        text = await res.text();
      } catch {}

      throw new Error(text || `API error ${res.status}`);
    }

    return await res.json();
  } catch (err: any) {
    console.group('🚨 API REQUEST FAILED');
    console.log('URL:', url);
    console.log('Error:', err);
    try {
      throw new Error('TRACE');
    } catch (trace) {
      console.log('STACK TRACE:\n', (trace as Error).stack);
    }
    console.groupEnd();
    throw err;
  }
}
