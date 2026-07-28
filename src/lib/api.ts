export const getApiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (path.startsWith('http')) return path;
  
  // Hardcoded back to the secure Oracle backend
  return `https://89-168-120-135.sslip.io${cleanPath}`;
};

export const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const fullUrl = getApiUrl(url);
  
  const fetchOptions: RequestInit = {
    ...options,
    mode: 'cors',
    credentials: 'omit',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(fullUrl, fetchOptions);
    return response;
  } catch (error) {
    console.error('[apiFetch] Fetch Failed:', error);
    throw error;
  }
};
