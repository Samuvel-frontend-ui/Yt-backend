/** Proxies /api/* to Render so POST works on Vercel (static SPA alone returns 405). */

const BACKEND = 'https://yt-backend-ys8d.onrender.com';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
]);

function forwardHeaders(incoming: Headers): Headers {
  const out = new Headers();
  incoming.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) out.set(key, value);
  });
  return out;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const p = url.searchParams.get('p') ?? '';
    if (!p || p.includes('..')) {
      return Response.json({ error: 'Bad path' }, { status: 400 });
    }
    url.searchParams.delete('p');
    const qs = url.searchParams.toString();
    const targetUrl = `${BACKEND}/api/${p}${qs ? `?${qs}` : ''}`;

    const init: RequestInit = {
      method: request.method,
      headers: forwardHeaders(request.headers),
      redirect: 'follow',
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const buf = await request.arrayBuffer();
      if (buf.byteLength) init.body = buf;
    }

    const upstream = await fetch(targetUrl, init);
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: upstream.headers,
    });
  },
};
