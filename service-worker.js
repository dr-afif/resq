const CACHE_NAME = "resq-static-v1";

const APP_SHELL_FILES = [
  "./",
  "./index.html",
  "./webform1.html",
  "./roster.html",
  "./info.html",
  "./manifest.json",
  "./dashboard.css",
  "./monitor.css",
  "./webform.css",
  "./roster.css",
  "./info.css",
  "./navbar.css",
  "./top-navigation.css",
  "./topnav.css",
  "./app.js",
  "./monitor.js",
  "./roster.js",
  "./info.js",
  "./top-navigation.js",
  "./navbar.js",
  "./js/config.js",
  "./js/pwa-status.js",
  "./navbar.html",
  "./top-navigation.html",
  "./icons/resq-192.png",
  "./icons/resq-512.png",
  "./icons/resq-16x16.png",
  "./icons/resq-32x32.png",
  "./icons/apple-touch-icon.png",
  "./icons/home_icon.png",
  "./icons/calendar_icon.svg",
  "./icons/logo.png",
  "./icons/logo-resq-text.png"
];

const CACHE_FIRST_EXTENSIONS = [".css", ".js", ".png", ".jpg", ".jpeg", ".svg", ".ico", ".webp"];
const NAV_FILES = ["navbar.html", "top-navigation.html"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (isHtmlRequest(event.request, requestUrl)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (isCacheFirstRequest(requestUrl)) {
    event.respondWith(cacheFirst(event.request));
  }
});

function isHtmlRequest(request, requestUrl) {
  return request.mode === "navigate" || requestUrl.pathname.endsWith(".html");
}

function isCacheFirstRequest(requestUrl) {
  return CACHE_FIRST_EXTENSIONS.some(extension => requestUrl.pathname.endsWith(extension)) ||
    NAV_FILES.some(fileName => requestUrl.pathname.endsWith(fileName));
}

async function cacheFirst(request) {
  const requestUrl = new URL(request.url);
  const isNavFile = NAV_FILES.some(fileName => requestUrl.pathname.endsWith(fileName));
  const cachedResponse = await caches.match(request, { ignoreSearch: isNavFile });
  if (cachedResponse) return cachedResponse;

  const networkResponse = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, networkResponse.clone());
  return networkResponse;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const networkResponse = await fetch(request);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || caches.match("./index.html");
  }
}
