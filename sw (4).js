const CACHE='tms-v7';
const ASSETS=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting(); // Immediately activate new SW
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>{if(k!==CACHE)return caches.delete(k);}))));
  self.clients.claim(); // Take control of all clients immediately
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  // Network first, cache fallback
  event.respondWith(
    fetch(event.request).then(r=>{const c=r.clone();caches.open(CACHE).then(ca=>ca.put(event.request,c));return r;}).catch(()=>caches.match(event.request))
  );
});
self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='reminder'){
    self.registration.showNotification(event.data.title||'Track My Speck',{body:event.data.body||'Erinnerung!',icon:'icon-192.png',badge:'icon-192.png',tag:'tms-reminder',vibrate:[200,100,200]});
  }
});
