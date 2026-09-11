/**
 * Utility functions for optimizing images from Supabase or Cloudflare.
 */

export function getOptimizedImageUrl(
  url: string | null | undefined,
  width: number = 300,
  height: number = 300,
  format: 'cover' | 'contain' = 'cover'
): string | undefined {
  if (!url) return undefined;

  // Supabase Storage Optimization
  if (url.includes('supabase.co/storage/v1/object/public')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}width=${width}&height=${height}&resize=${format}`;
  }

  // Cloudflare Image Resizing (/cdn-cgi/image/...)
  // Assuming the app's production domain is used for cloudflare images
  // For example: https://tuungane.com/some/image.jpg -> https://tuungane.com/cdn-cgi/image/width=...,height=...,fit=cover/some/image.jpg
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    // Check if the domain is tuungane.com or it's a known R2 custom domain, 
    // and ensure it doesn't already have cdn-cgi to prevent double applying.
    if (!url.includes('/cdn-cgi/image/') && (domain.includes('tuungane.com') || domain.includes('r2.dev'))) {
      const path = urlObj.pathname + urlObj.search;
      return `${urlObj.origin}/cdn-cgi/image/width=${width},height=${height},fit=${format}${path}`;
    }
  } catch (e) {
    // If invalid URL, return as is
  }

  return url;
}
