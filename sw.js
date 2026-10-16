const CACHE="ascension-v1";
const CORE=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./icon-maskable-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const req=e.request; if(req.method!=="GET")return;
  const url=new URL(req.url);
  if(url.origin===location.origin){
    // app files: serve instantly from cache, refresh in the background
    e.respondWith(caches.open(CACHE).then(async c=>{
      const hit=await c.match(req,{ignoreSearch:true})||(req.mode==="navigate"?await c.match("./index.html"):null);
      const net=fetch(req).then(r=>{if(r.ok)c.put(req,r.clone());return r}).catch(()=>hit);
      return hit||net;
    }));
  } else if(/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
    // fonts: keep a copy so the app looks right offline
    e.respondWith(caches.open(CACHE).then(async c=>{const hit=await c.match(req);if(hit)return hit;
      try{const r=await fetch(req);c.put(req,r.clone());return r}catch(err){return new Response("",{status:504})}}));
  }
});
function readState(){return new Promise(res=>{const r=indexedDB.open("ascension",1);
  r.onupgradeneeded=()=>r.result.createObjectStore("kv");
  r.onsuccess=()=>{try{const g=r.result.transaction("kv").objectStore("kv").get("state");g.onsuccess=()=>res(g.result);g.onerror=()=>res(null)}catch(e){res(null)}};
  r.onerror=()=>res(null)})}
self.addEventListener("periodicsync",e=>{if(e.tag!=="ascension-daily")return;
  e.waitUntil(readState().then(s=>{if(!s)return;
    const d=new Date(),t=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
    const blocks=(s.blocks||[]).filter(b=>b.days.includes(d.getDay())).sort((a,b)=>a.start<b.start?-1:1);
    const tasks=(s.tasks||[]).filter(x=>!x.done&&x.due&&x.due<=t).length;
    const revs=(s.topics||[]).filter(x=>x.next<=t).length;
    const first=blocks.find(b=>b.start>=String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0"));
    return self.registration.showNotification("ascension.",{tag:"daily-"+t,icon:"./icon-192.png",
      body:(first?"Next: "+first.title+" at "+first.start+". ":"")+tasks+" task"+(tasks===1?"":"s")+" due · "+revs+" review"+(revs===1?"":"s")});
  }))});
self.addEventListener("notificationclick",e=>{e.notification.close();
  e.waitUntil(self.clients.matchAll({type:"window"}).then(w=>w.length?w[0].focus():self.clients.openWindow("./")))});
