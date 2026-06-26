// Compatibility shim: converts Netlify Functions v2 Request/Response to v1 req/res pattern
// Usage: export default compatHandler(async (req, res) => { ... })

export function compatHandler(v1Handler) {
  return async (request, context) => {
    // Build a v1-style req object from the v2 Request
    const url = new URL(request.url);
    const req = {
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      query: Object.fromEntries(url.searchParams.entries()),
      body: null,
    };

    // Parse body for POST/PUT/PATCH
    if (request.method !== 'GET' && request.method !== 'DELETE') {
      try {
        const text = await request.text();
        req.body = text ? JSON.parse(text) : {};
      } catch {
        req.body = {};
      }
    }

    // Build a v1-style res object that captures responses
    let statusCode = 200;
    let responseBody = null;
    let responseHeaders = { 'Content-Type': 'application/json' };

    const res = {
      status(code) {
        statusCode = code;
        return res;
      },
      json(data) {
        responseBody = JSON.stringify(data);
        return res;
      },
      setHeader(name, value) {
        responseHeaders[name] = value;
        return res;
      },
      end(data) {
        responseBody = data || '';
        return res;
      },
    };

    // Call the v1 handler
    await v1Handler(req, res);

    // If no body was set, return empty
    if (responseBody === null) {
      return new Response(null, { status: statusCode });
    }

    // Build v2 Response
    const responseInit = {
      status: statusCode,
      headers: responseHeaders,
    };

    // Handle Set-Cookie header (can be an array)
    if (responseHeaders['Set-Cookie']) {
      const headers = new Headers();
      for (const [key, value] of Object.entries(responseHeaders)) {
        if (key === 'Set-Cookie' && Array.isArray(value)) {
          value.forEach(v => headers.append('Set-Cookie', v));
        } else {
          headers.set(key, value);
        }
      }
      responseInit.headers = headers;
    }

    return new Response(responseBody, responseInit);
  };
}