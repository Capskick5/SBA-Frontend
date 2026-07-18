export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const url = new URL(request.url);

  // Construct target base URL based on the route
  let targetBaseUrl = process.env.BACKEND_API_URL || 'http://localhost:8080';
  if (url.pathname.startsWith('/minio/')) {
    targetBaseUrl = process.env.MINIO_API_URL || 'http://localhost:9000';
  }

  // Construct final target URL
  const targetUrl = new URL(url.pathname + url.search, targetBaseUrl);

  // Clone headers and add secret signature
  const headers = new Headers(request.headers);
  headers.set('X-SBA-Signature', process.env.SBA_VERCEL_SECRET || '');
  
  // Remove headers that might cause host mismatch
  headers.delete('host');
  headers.delete('connection');

  // Prepare fetch options
  const fetchOptions = {
    method: request.method,
    headers: headers,
  };

  // Only attach body for mutation methods
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    fetchOptions.body = request.body;
    fetchOptions.duplex = 'half';
  }

  try {
    const response = await fetch(targetUrl.toString(), fetchOptions);
    
    // Pass back response headers
    const responseHeaders = new Headers(response.headers);
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(JSON.stringify({ error: 'Proxy failed', details: error.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
