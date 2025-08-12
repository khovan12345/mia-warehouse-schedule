/**
 * Service Worker for MIA.VN Warehouse Schedule System
 * Enables offline functionality and caching
 */

const CACHE_NAME = "mia-schedule-v2.0.0";
const urlsToCache = [
  "/",
  "/index.html",
  "/src/css/main.css",
  "/src/css/dark-mode.css",
  "/src/css/print.css",
  "/src/js/app.js",
  "/src/js/config.js",
  "/src/js/utils.js",
  "/src/js/storage.js",
  "/src/js/schedule.js",
  "/src/js/ui.js",
  "/src/js/export.js",
  "/src/js/charts.js",
  "/manifest.json",
];

// Install event - cache resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Opened cache");
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }

      // Clone the request
      const fetchRequest = event.request.clone();

      return fetch(fetchRequest)
        .then((response) => {
          // Check if valid response
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache the response for future use
          caches.open(CACHE_NAME).then((cache) => {
            // Don't cache API calls or external resources
            const url = new URL(event.request.url);
            if (url.origin === location.origin) {
              cache.put(event.request, responseToCache);
            }
          });

          return response;
        })
        .catch(() => {
          // Offline fallback
          if (event.request.destination === "document") {
            return caches.match("/index.html");
          }
        });
    })
  );
});

// Background sync for data persistence
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-schedule") {
    event.waitUntil(syncScheduleData());
  }
});

// Push notifications
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: "/assets/icons/icon-192x192.png",
      badge: "/assets/icons/badge-72x72.png",
      vibrate: [200, 100, 200],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1,
      },
      actions: [
        {
          action: "view",
          title: "Xem chi tiết",
          icon: "/assets/icons/view.png",
        },
        {
          action: "close",
          title: "Đóng",
          icon: "/assets/icons/close.png",
        },
      ],
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "view") {
    event.waitUntil(clients.openWindow("/"));
  }
});

// Helper function to sync data
async function syncScheduleData() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();

    // Find and sync schedule data
    for (const request of requests) {
      if (request.url.includes("/api/schedule")) {
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response);
        }
      }
    }
  } catch (error) {
    console.error("Sync failed:", error);
  }
}

// Message handler for skip waiting
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
