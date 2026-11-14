// Painéis de vendas — service worker do app instalado.
// Regra: sempre busca a versão mais nova na internet. A cópia guardada
// só é usada quando o celular está sem internet, para o app ao menos abrir.
// Não toca nos pedidos para a planilha (outro endereço) nem em envios (POST).
const CACHE = 'paineis-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter(n => n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(daRede(req, url));
});

async function daRede(req, url) {
  try {
    const res = await fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' });
    if (res.ok && res.type === 'basic') {
      const copia = res.clone();
      caches.open(CACHE).then(c => c.put(url.origin + url.pathname, copia)).catch(() => {});
    }
    if (res.redirected) {
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers });
    }
    return res;
  } catch (err) {
    const guardada = await caches.match(url.origin + url.pathname);
    if (guardada) return guardada;
    if (req.mode === 'navigate') {
      return new Response(
        '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>Sem internet</title><body style="font-family:system-ui,sans-serif;background:#0D1310;color:#EAF2ED;' +
        'display:grid;place-items:center;min-height:90vh;text-align:center;padding:24px">' +
        '<div><h2 style="margin:0 0 8px">Sem internet</h2><p style="opacity:.7;margin:0">Conecte o celular e abra o painel de novo.</p></div>',
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }
    return Response.error();
  }
}
