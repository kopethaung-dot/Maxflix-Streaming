/* =====================================================================
   Maxflix — Web Push service worker
   index.html နဲ့ တူတဲ့ folder ထဲမှာ (sw.js ဘေးမှာ) တင်ထားရမယ့် ဖိုင်။
   - Admin က Premium Approve/Reject လုပ်ရင် App ပိတ်ထားတုန်းပဲဖြစ်ဖြစ် notification ပြပေးတယ်။
   - ဒီဖိုင်က ရှိပြီးသား sw.js (offline cache) နဲ့ သီးသန့်ပါ — ဘာမှ မထိခိုက်ပါ။
     index.html က ဒါကို scope "./push-scope/" နဲ့ သီးခြား register လုပ်တာမို့ cache/fetch ကို မထိပါ။
   ===================================================================== */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { body: event.data ? event.data.text() : '' }; }
  const options = {
    body: data.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    data: { url: data.url || './' }
  };
  if (data.tag) { options.tag = data.tag; options.renotify = true; }
  // userVisibleOnly:true မို့ push တစ်ခုတိုင်းမှာ notification ပြကိုပြရမယ်
  event.waitUntil(self.registration.showNotification(data.title || 'Maxflix', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const siteBase = new URL('./', self.location).href;               // push-sw.js ရှိတဲ့ folder = site root
  const target = new URL((event.notification.data && event.notification.data.url) || './', siteBase).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.startsWith(siteBase)) { try { await c.focus(); return; } catch (e) { /* openWindow နဲ့ ဆက် */ } }
    }
    await self.clients.openWindow(target);
  })());
});
