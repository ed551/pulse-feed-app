/**
 * API utility to handle base URLs for different deployment environments.
 * When running on Surge (static only), VITE_API_BASE_URL should point to the Oracle Cloud VPS backend.
 */
export const getApiUrl = (path: string): string => {
  // Clear legacy custom backend URL to prevent stale manual routing issues
  if (typeof window !== 'undefined' && window.localStorage.getItem('CUSTOM_API_BASE_URL')) {
    window.localStorage.removeItem('CUSTOM_API_BASE_URL');
  }

  const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const baseUrl = (rawBaseUrl || 'https://89-168-120-135.sslip.io').trim();
  const relayUrl = (import.meta.env.VITE_API_RELAY_URL || 'https://ais-dev-vpm462ccg3jpy6a7n4c54f-708516523970.europe-west2.run.app').trim();
  
 HEAD
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isSurge = typeof window !== 'undefined' && window.location.hostname.includes('surge.sh');
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // Use the current origin as the relay if we are on a run.app domain (e.g. Shared Preview)
  const defaultRelay = currentOrigin.includes('run.app') ? currentOrigin : 'https://ais-pre-vpm462ccg3jpy6a7n4c54f-708516523970.europe-west2.run.app';
  const finalRelayUrl = (import.meta.env.VITE_API_RELAY_URL || defaultRelay).trim();
  
  // Detect if we are in an AI Studio / Cloud Shell / Proxied environment
  const isProxied = currentHostname.includes('google') || 
                    currentHostname.includes('cloud') || 
                    currentHostname.includes('aistudio') ||
                    currentHostname.includes('editor') ||
                    currentHostname.includes('shell') ||
                    currentHostname.includes('run.app'); // run.app is also proxied in a sense

  const isRunApp = currentHostname.includes('run.app');
  const isLocal = currentHostname === 'localhost' || currentHostname === '127.0.0.1';

  // If we are on Surge or RunApp, and not on the primary backend, use relative paths if on the same origin
  // If we are on a different domain (like Surge), use the relayUrl
  if (isSurge) {
    const cleanRelay = finalRelayUrl.endsWith('/') ? finalRelayUrl.slice(0, -1) : finalRelayUrl;
    return `${cleanRelay}${cleanPath}`;
  }

  // Same-origin requests should always use relative paths for reliability
  if (isRunApp || isLocal) {
    return cleanPath;
  }

  // If we are in a proxied environment (AI Studio Editor), we must use the relay
  if (isProxied) {
    const cleanRelay = finalRelayUrl.endsWith('/') ? finalRelayUrl.slice(0, -1) : finalRelayUrl;
    return `${cleanRelay}${cleanPath}`;
  }

  // If the user EXPLICITLY set a base URL, they likely want to use it regardless of env
  if (rawBaseUrl) {
    const cleanBase = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
    return `${cleanBase}${cleanPath}`;
  }

  // Fallback to the default VPS backend if not in local/preview
  if (baseUrl) {
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${cleanBase}${cleanPath}`;

  if (baseUrl) {
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const finalUrl = `${cleanBase}${cleanPath}`;
    console.log(`[API Proxy] Routing ${path} -> ${finalUrl}`);
    return finalUrl;
  }
  
  // Diagnostic for Surge/Production deployments without backend URL
  // We automatically route to the Oracle Cloud backend when deployed to Surge or a static environment to prevent 404s.
  // CRITICAL: On Cloud Run (.run.app), localhost, google domains, or dev workspaces, we must use our own local backend routes.
  const isLocalStorageOrDev = 
    window.location.hostname.includes('localhost') || 
    window.location.hostname.includes('127.0.0.1') || 
    window.location.hostname.includes('run.app') ||
    window.location.hostname.includes('google') ||
    window.location.hostname.includes('cloud');h

  if (!isLocalStorageOrDev) {
    // Determine protocol: usage of http on an https site (like Surge) will be blocked by browsers.
    // However, if the user explicitly provided http://89.168.120.135, we follow it.
    const fallbackBaseUrl = 'https://eight-webs-attend.loca.lt';
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const finalUrl = `${fallbackBaseUrl}/${cleanPath}`;
    
    if (window.location.protocol === 'https:' && fallbackBaseUrl.startsWith('http:')) {
      console.warn(`[API Proxy] Warning: Site is HTTPS but API is HTTP. Browser may block requests to ${finalUrl}`);
    }
    
      console.log(`[API Proxy Fallback] Routing ${path} -> ${finalUrl}`);
  return finalUrl;
}

return cleanPath;
};

/**
 * Universal fetch wrapper that automatically applies the API base URL.
 * Includes retries for network failures to handle transient connection hiccups.
 */
export const apiFetch = async (path: string, options: RequestInit = {}, retries = 2): Promise<Response> => {
  const url = getApiUrl(path);
  
  const executeFetch = async (attempt: number): Promise<Response> => {
    const controller = new AbortController();
    // Timeout of 90s for first attempt and 120s for retries to allow for server-side AI model fallbacks and responses
    const timeoutId = setTimeout(() => controller.abort(), attempt === 0 ? 90000 : 120000); 
    
    try {
      const fetchOptions: RequestInit = {
        ...options,
        signal: controller.signal,
        mode: 'cors',
        credentials: 'include', // Changed from omit to include for better auth compatibility
        headers: {
          ...options.headers,
        },
      };

      // Only add JSON content type if it's a POST/PUT with a body
      if (options.method && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase()) && options.body && !fetchOptions.headers?.hasOwnProperty('Content-Type')) {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          'Content-Type': 'application/json'
        };
      }

      console.log(`[apiFetch] Calling: ${url} (Mode: ${fetchOptions.mode}, Credentials: ${fetchOptions.credentials})`);
      console.log(`[apiFetch] Path: ${path}, UrlObj:`, new URL(url, window.location.origin));
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      const isNetworkError = 
        (error.name === 'TypeError' && (error.message === 'Failed to fetch' || error.message?.includes('NetworkError'))) ||
        error.name === 'AbortError' ||
        error.name === 'TimeoutError' ||
        error.message?.includes('failed to fetch');

      if (isNetworkError && attempt < retries) {
        console.warn(`[apiFetch] ${path} failed (attempt ${attempt + 1}/${retries + 1}). Retrying in 2s...`, error);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return executeFetch(attempt + 1);
      }
      console.error(`[apiFetch] ${path} final error:`, error);
      throw error;
    }
  };

  return executeFetch(0);
};
