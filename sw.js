const CACHE_NAME = 'coletas-pwa-v3.0';

const RECURSOS_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2'
];

// Instalação e cache inicial
self.addEventListener('install', event => {
  console.log('SW: Instalando versão', CACHE_NAME);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(RECURSOS_CACHE))
      .catch(erro => {
        console.error('SW: Erro ao cachear:', erro);
        return caches.open(CACHE_NAME).then(cache => 
          cache.addAll(['./', './index.html'])
        );
      })
  );
  
  self.skipWaiting();
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', event => {
  console.log('SW: Ativado');
  
  event.waitUntil(
    caches.keys().then(nomes => 
      Promise.all(
        nomes
          .filter(nome => nome !== CACHE_NAME)
          .map(nome => caches.delete(nome))
      )
    )
  );
  
  return self.clients.claim();
});

// Estratégia de cache
self.addEventListener('fetch', event => {
  const { origin, pathname } = new URL(event.request.url);
  
  // Recursos do mesmo domínio
  if (origin === location.origin) {
    event.respondWith(
      caches.match(event.request)
        .then(respostaCache => {
          if (respostaCache) {
            return respostaCache;
          }
          
          return fetch(event.request)
            .then(resposta => {
              if (resposta && resposta.status === 200) {
                const clone = resposta.clone();
                caches.open(CACHE_NAME).then(cache => 
                  cache.put(event.request, clone)
                );
              }
              return resposta;
            })
            .catch(() => {
              if (event.request.mode === 'navigate') {
                return caches.match('./index.html');
              }
              return new Response('', { status: 404 });
            });
        })
    );
  } 
  // Recursos externos
  else {
    event.respondWith(
      caches.match(event.request)
        .then(respostaCache => respostaCache || fetch(event.request))
        .catch(() => new Response('', { status: 200 }))
    );
  }
});

// Comunicação com clientes
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});