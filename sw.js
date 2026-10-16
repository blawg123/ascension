/* ascension. version 3 */
const CACHE="ascension-v3";
const CORE=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./icon-maskable-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE.map(u=>new Request(u,{cache:"reload"})))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE&&x!=="ascension-override"&&x!=="ascension-fonts").map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const req=e.request; if(req.method!=="GET")return;
  const url=new URL(req.url);
  if(url.origin===location.origin){
    if(req.mode==="navigate"||url.pathname.endsWith("/index.html")){
      // an update pasted into the app wins; otherwise newest online copy, saved copy offline
      e.respondWith(caches.open("ascension-override").then(c=>c.match("./index.html")).then(o=>o||fetch(req,{cache:"no-store"}).then(r=>{if(r.ok){const c=r.clone();caches.open(CACHE).then(x=>x.put("./index.html",c))}return r})
        .catch(()=>caches.match("./index.html"))));
      return;
    }
    e.respondWith(caches.match(req,{ignoreSearch:true}).then(hit=>hit||fetch(req).then(r=>{if(r.ok){const c=r.clone();caches.open(CACHE).then(x=>x.put(req,c))}return r})));
  } else if(/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
    e.respondWith(caches.open("ascension-fonts").then(async c=>{const hit=await c.match(req);if(hit)return hit;
      try{const r=await fetch(req);c.put(req,r.clone());return r}catch(err){return new Response("",{status:504})}}));
  }
});
function readState(){return new Promise(res=>{const r=indexedDB.open("ascension",1);
  r.onupgradeneeded=()=>r.result.createObjectStore("kv");
  r.onsuccess=()=>{try{const g=r.result.transaction("kv").objectStore("kv").get("state");g.onsuccess=()=>res(g.result);g.onerror=()=>res(null)}catch(e){res(null)}};
  r.onerror=()=>res(null)})}
self.addEventListener("periodicsync",e=>{if(e.tag!=="ascension-daily")return;
  e.waitUntil(readState().then(s=>{if(!s)return;
    const d=new Date(),p=n=>String(n).padStart(2,"0"),t=d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate()),hm=p(d.getHours())+":"+p(d.getMinutes());
    const blocks=(s.blocks||[]).filter(b=>b.days.includes(d.getDay())).sort((a,b)=>a.start<b.start?-1:1);
    const tasks=(s.tasks||[]).filter(x=>!x.done&&x.due&&x.due<=t).length;
    const revs=(s.topics||[]).filter(x=>x.next<=t).length;
    const first=blocks.find(b=>b.start>=hm);
    return self.registration.showNotification("ascension.",{tag:"daily-"+t,icon:"./icon-192.png",
      body:(first?"Next: "+first.title+" at "+first.start+". ":"")+tasks+" task"+(tasks===1?"":"s")+" due · "+revs+" review"+(revs===1?"":"s")});
  }))});
self.addEventListener("notificationclick",e=>{e.notification.close();
  e.waitUntil(self.clients.matchAll({type:"window"}).then(w=>w.length?w[0].focus():self.clients.openWindow("./")))});
