export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'API error');
    }
    return await res.json();
  } catch (err) {
    console.error('API REQUEST FAILED', err);
    throw err;
  }
}
