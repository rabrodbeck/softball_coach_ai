const CACHE_NAME = "coach-ai-v2";
const ASSETS = [
    "/",
    "/index.html",
    "/favicon.svg",
    "/icons.svg",
    "/manifest.json"
];

// Install Event - cache core shell assets
self.addEventListener("install", (e) => {
    self.skipWaiting(); // Force active immediately
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Activate Event - clear old caches
self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim()) // claim control immediately
    );
});

// Fetch Event - Network First for document requests, Cache First for static assets
self.addEventListener("fetch", (e) => {
    // Only intercept HTTP/HTTPS schemes (avoid chrome-extension issues)
    if (!e.request.url.startsWith('http')) return;

    // Network First strategy for navigation / document requests (index.html)
    const isHtml = e.request.mode === "navigate" || 
                   (e.request.headers.get("accept") && e.request.headers.get("accept").includes("text/html"));
                   
    if (isHtml) {
        e.respondWith(
            fetch(e.request)
                .then((response) => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(e.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    return caches.match(e.request) || caches.match("/index.html");
                })
        );
        return;
    }

    // Cache First for static assets listed in ASSETS, default to network otherwise
    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(e.request);
        })
    );
});

