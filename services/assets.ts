export function resolveImageUrl(url?: string): string {
  if (!url) return "";
  if (/^https?:\/\//.test(url)) return url;
  const apiRoot = ((import.meta as any)?.env?.VITE_API_URL || 'http://localhost:3000/v1').replace(/\/v1\/?$/, '');
  if (url.startsWith('/uploads/')) return apiRoot + url;
  return url;
}
