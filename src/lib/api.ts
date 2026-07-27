/**
 * Utility to resolve base URLs for different deployment environments.
 * Points frontend requests to the Oracle Cloud VPS backend or configured API endpoints.
 */

export const getApiUrl = (path: string): string => {
  // Check manual override variable in localStorage if set
  if (typeof window !== 'undefined' && window.localStorage.getItem('CUSTOM_API_BASE_URL')) {
    const custom = window.localStorage.getItem('CUSTOM_API_BASE_URL') || '';
    const cleanCustom = custom.endsWith('/') ? custom.slice(0, -1) : custom;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanCustom}${cleanPath}`;
  }

  const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const rawRelay = import.meta.env.VITE_API_RELAY_URL || 'https://89-168-120-135.sslip.io';

  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // If path is already a full URL (http:// or https://), return it directly
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // 1. If explicit VITE_API_BASE_URL is provided in environment, use it
  if (rawBaseUrl) {
    const cleanBase = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
    return `${cleanBase}${cleanPath}`;
  }

  // 2. Determine environment context
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isSurgeOrStatic = hostname.includes('surge.sh') || hostname.includes('pulsefeeds.space');

  // 3. On Surge / custom domain static hosting, route API calls to Oracle Cloud backend relay
  if (isSurgeOrStatic) {
    const cleanRelay = rawRelay.endsWith('/') ? rawRelay.slice(0, -1) : rawRelay;
    return `${cleanRelay}${cleanPath}`;
  }

  // 4. Default fallback for local or internal proxy
  return cleanPath;
};

/**
 * Enhanced fetch wrapper that automatically applies the API base URL.
 * Includes retries for network failures to handle transient connection hiccups.
 */
export const apiFetch = async (url: string, options: RequestInit = {}, retries = 1): Promise<Response> => {
  const fetchWithRetry = async (attempt: number): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), attempt === 0 ? 30000 : 120000);

    try {
      const fetchOptions: RequestInit = {
        ...options,
        signal: controller.signal,
        mode: 'cors',
        credentials: 'include',
        headers: {
          ...options.headers,
        },
      };

      // Add JSON Content-Type for POST/PUT/PATCH requests with a body
      const method = (options.method || 'GET').toUpperCase();
      if (['POST', 'PUT', 'PATCH'].includes(method) && options.body) {
        const headers = (fetchOptions.headers || {}) as Record<string, string>;
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/json';
        }
        fetchOptions.headers = headers;
      }

      const fullUrl = getApiUrl(url);
      console.log(`[apiFetch] Calling: ${fullUrl} (method: ${method})`);

      const response = await fetch(fullUrl, fetchOptions);
      clearTimeout(timeoutId);
      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);

      const isNetworkError =
        err.name === 'AbortError' ||
        err.name === 'TypeError' ||
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('failed to fetch');

      if (isNetworkError && attempt < retries) {
        console.warn(`[apiFetch] Signal failed (attempt ${attempt + 1}/${retries + 1}). Retrying in 2s...`, err);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return fetchWithRetry(attempt + 1);
      }

      console.error('[apiFetch] Final error:', err);
      throw err;
    }
  };

  return fetchWithRetry(0);
};
