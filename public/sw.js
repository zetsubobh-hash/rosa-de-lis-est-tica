// Service worker "kill switch".
// Substitui o antigo SW de cache (Workbox) que ficou preso servindo
// arquivos velhos e impedia o site de carregar após novos deploys.
// Ele limpa todos os caches, se desregistra e recarrega as abas abertas.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Apaga todos os caches criados pelo SW antigo
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));

      // Assume o controle das abas abertas
      await self.clients.claim();

      // Desregistra a si mesmo — o site passa a rodar sem service worker
      await self.registration.unregister();

      // Recarrega as abas abertas para buscar a versão nova do site
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((client) => client.navigate(client.url));
    })()
  );
});

// Não intercepta nenhuma requisição: tudo vai direto para a rede.
