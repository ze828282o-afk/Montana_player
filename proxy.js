export const config = { runtime: 'edge' };

export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');

  if (!target) {
    return new Response('Missing url parameter', { status: 400 });
  }

  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch (e) {
    return new Response('Invalid url', { status: 400 });
  }
  if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
    return new Response('Unsupported protocol', { status: 400 });
  }

  const fwdHeaders = {};
  const range = request.headers.get('range');
  if (range) fwdHeaders['range'] = range;

  let upstream;
  try {
    upstream = await fetch(targetUrl.toString(), { headers: fwdHeaders });
  } catch (e) {
    return new Response('Upstream fetch failed', { status: 502 });
  }

  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control']
    .forEach((h) => {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    });

  return new Response(upstream.body, { status: upstream.status, headers });
}
