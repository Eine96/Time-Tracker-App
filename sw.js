const CACHE_NAME = 'time-tracker-cache-v3'; // 再次更新版本号，以确保Service Worker更新

// 清单保持不变，但要确保文件名正确！
const urlsToCache = [
  './',
  './tracker.html', // 确保这是您HTML文件的正确名称
  './icon-512x512.png'
];

// install事件：缓存核心文件，这部分保持不变
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache opened.');
        return cache.addAll(urlsToCache);
      })
      .then(() => console.log('Service Worker: All core files cached successfully!'))
      .catch(error => console.error('Service Worker: Caching failed:', error))
  );
});

// activate事件：删除旧缓存，这部分也保持不变
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName.startsWith('time-tracker-cache-') && cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});


// --- 核心改动：采用“网络优先”策略重写fetch事件 ---
self.addEventListener('fetch', event => {
  event.respondWith(
    // 1. 首先，尝试从网络获取最新版本
    fetch(event.request)
      .then(networkResponse => {
        // 2. 如果成功从网络获取
        // 打开我们的缓存仓库
        return caches.open(CACHE_NAME).then(cache => {
          // 将最新的版本存入缓存（更新仓库里的存货）
          // response.clone()是必须的，因为响应体只能被读取一次
          cache.put(event.request, networkResponse.clone());
          console.log('Service Worker: Fetched and cached new version for', event.request.url);
          // 将最新的版本返回给浏览器
          return networkResponse;
        });
      })
      .catch(() => {
        // 3. 如果网络请求失败了（例如，用户断网了）
        console.log('Service Worker: Network request failed. Trying to serve from cache for', event.request.url);
        // 就去缓存仓库里找旧的存货并返回
        return caches.match(event.request);
      })
  );
});