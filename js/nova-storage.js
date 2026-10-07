/* NexoraWildfire local data layer: IndexedDB with localStorage migration fallback. */
(function(){
  const DB_NAME="nexorawildfire-edge";
  const DB_VERSION=1;
  const STORES=["areas","observations","timeseries","alerts","settlements","meta"];
  let dbPromise=null;
  function open(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{const db=req.result; STORES.forEach(n=>{if(!db.objectStoreNames.contains(n)){const s=db.createObjectStore(n,{keyPath:"id"});s.createIndex("updatedAt","updatedAt");}})};
      req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
    }); return dbPromise;
  }
  async function put(store,value){const db=await open();return new Promise((res,rej)=>{const tx=db.transaction(store,"readwrite");tx.objectStore(store).put(value);tx.oncomplete=()=>res(value);tx.onerror=()=>rej(tx.error)})}
  async function getAll(store){const db=await open();return new Promise((res,rej)=>{const r=db.transaction(store).objectStore(store).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)})}
  async function get(store,id){const db=await open();return new Promise((res,rej)=>{const r=db.transaction(store).objectStore(store).get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
  async function remove(store,id){const db=await open();return new Promise((res,rej)=>{const tx=db.transaction(store,"readwrite");tx.objectStore(store).delete(id);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
  async function clear(store){const db=await open();return new Promise((res,rej)=>{const tx=db.transaction(store,"readwrite");tx.objectStore(store).clear();tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
  async function migrate(){
    try{
      const raw=JSON.parse(localStorage.getItem("nexorawildfire-my-areas-v1")||"[]");
      for(const a of raw) await put("areas",{...a,id:String(a.id),updatedAt:Date.now()});
      if(raw.length)localStorage.setItem("nexorawildfire-idb-migrated","1");
      const alerts=JSON.parse(localStorage.getItem("nexorawildfire-alerts-v1")||"[]");
      for(const a of alerts) await put("alerts",{...a,id:a.id||crypto.randomUUID(),updatedAt:a.createdAt||Date.now()});
      window.dispatchEvent(new CustomEvent("nova:idb-ready"));
    }catch(e){console.warn("Nova Edge storage",e)}
  }
  window.NovaStore={open,put,get,getAll,remove,clear,migrate};
  if("indexedDB" in window) open().then(migrate).catch(()=>{});
})();
