// 厦门天气 Service Worker
var CACHE_NAME = 'xiamen-weather-v1';
var STATIC_ASSETS = [
  '.',
  'index.html',
  'manifest.json',
  'icon.svg'
];

// 安装：缓存静态资源
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// 请求拦截：静态资源走缓存，API 走网络
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // 天气 API 请求：网络优先，失败用缓存
  if (url.hostname === 'api.open-meteo.com') {
    e.respondWith(
      fetch(e.request).then(function(resp) {
        var clone = resp.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, clone);
        });
        return resp;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }

  // 静态资源：缓存优先
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(resp) {
        var clone = resp.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, clone);
        });
        return resp;
      });
    })
  );
});
