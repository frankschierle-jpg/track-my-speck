// TMS Service Worker
const CACHE = 'tms-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE) return caches.delete(key);
      }))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Background sync for reminders
self.addEventListener('periodicsync', event => {
  if (event.tag === 'tms-daily-reminder') {
    event.waitUntil(checkRemindersFromIDB());
  }
});

async function checkRemindersFromIDB() {
  try {
    const db = await openDB();
    const tx = db.transaction('reminders', 'readonly');
    const store = tx.objectStore('reminders');
    const all = await getAllFromStore(store);
    const now = new Date();
    const h = now.getHours(), m = now.getMinutes();
    for (const r of all) {
      if (!r.tracked && r.h === h && r.m === m) {
        self.registration.showNotification(`Track My Speck - ${r.userName}`, {
          body: `${r.label}: Gewicht noch nicht eingetragen!`,
          icon: './icon-192.png',
          tag: `rem-${r.id}`
        });
      }
    }
  } catch (e) { console.warn('SW reminder check failed:', e); }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('tmf-reminders', 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('reminders')) {
        db.createObjectStore('reminders', { keyPath: 'id' });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = reject;
  });
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = reject;
  });
}
