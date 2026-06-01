/* ============================================
 * 厦门天气 — Service Worker (离线缓存策略)
 * ============================================ */

var CACHE_NAME = 'xiamen-weather-v6';
var FILES_TO_CACHE = [
    './',
    'index.html',
    'css/style.css',
    'js/config.js',
    'js/weather.js',
    'js/background.js',
    'js/game.js',
    'js/app.js',
    'manifest.json',
    'icon.svg',
    'icon.ico',
    'icon-192.png',
    'icon-512.png',
    'icon-180.png',
    'icon-152.png'
];

// 安装：预缓存核心文件
self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(FILES_TO_CACHE);
        }).then(function() {
            self.skipWaiting();
        })
    );
});

// 激活：清理旧版本缓存
self.addEventListener('activate', function(e) {
    e.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.map(function(k) {
                    if (k !== CACHE_NAME) return caches.delete(k);
                })
            );
        }).then(function() {
            self.clients.claim();
        })
    );
});

// 请求拦截
self.addEventListener('fetch', function(e) {
    var url = new URL(e.request.url);

    // 跳过非 GET 请求
    if (e.request.method !== 'GET') return;

    // 天气 API 和 AQI API：网络优先，失败用缓存
    if (url.hostname === 'api.open-meteo.com' || url.hostname === 'air-quality-api.open-meteo.com') {
        e.respondWith(networkFirst(e.request));
        return;
    }

    // HTML 页面：网络优先
    if (e.request.mode === 'navigate') {
        e.respondWith(networkFirst(e.request));
        return;
    }

    // 其他静态资源：缓存优先
    e.respondWith(cacheFirst(e.request));
});

/* ---- 缓存优先策略 ---- */
function cacheFirst(request) {
    return caches.match(request).then(function(cached) {
        if (cached) return cached;
        return fetch(request).then(function(resp) {
            var clone = resp.clone();
            caches.open(CACHE_NAME).then(function(cache) {
                cache.put(request, clone);
            });
            return resp;
        });
    });
}

/* ---- 网络优先策略 (带超时回退) ---- */
function networkFirst(request) {
    return fetch(request).then(function(resp) {
        var clone = resp.clone();
        caches.open(CACHE_NAME).then(function(cache) {
            cache.put(request, clone);
        });
        return resp;
    }).catch(function() {
        return caches.match(request);
    });
}
