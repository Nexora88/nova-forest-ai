/* NexoraWildfire Tohum Kumbarası: server-authoritative ledger. */
(function(){
 const KEY="nexora-seed-wallet-cache-v2";
 function cache(x){try{localStorage.setItem(KEY,JSON.stringify(x))}catch{};window.dispatchEvent(new CustomEvent("nova:seed-updated",{detail:x}));return x}
 function get(){try{return JSON.parse(localStorage.getItem(KEY)||'{"points":0,"history":[]}')}catch{return {points:0,history:[]}}}
 async function refresh(){try{if(!window.NovaAuth?.isLoggedIn())return cache({points:0,history:[]});const x=await window.NovaAuth.getSeedWallet();return cache(x)}catch(e){console.warn("Seed wallet",e);return get()}}
 async function award(action,eventKey){if(!window.NovaAuth?.isLoggedIn())return get();const r=await window.NovaAuth.awardSeed(action,eventKey);await refresh();return r}
 function treeLevel(p){return Math.min(5,Math.floor(p/200))}
 function treeName(l){return ["Filiz","Kök Salan","Yapraklanan","Genç Ağaç","Güçlenen Orman","Nova Ağacı"][l]||"Filiz"}
 window.NovaSeeds={get,refresh,award,treeLevel,treeName,redeemable:()=>Math.floor(get().points/1000)};
 document.addEventListener("nova:auth-ready",async e=>{if(!e.detail.session)return;await refresh();const day=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Istanbul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());try{const r=await award("daily","daily:"+day);if(r?.awarded)await refresh()}catch(err){console.warn("Daily seed award",err)}const special={"01-01":"Yeni yıl","03-20":"Dünya Arıcılık Günü","03-21":"Dünya Ormancılık Günü","03-22":"Dünya Su Günü","04-23":"23 Nisan","05-14":"Dünya Çiftçiler Günü","05-19":"19 Mayıs","06-05":"Dünya Çevre Günü","08-30":"30 Ağustos","10-16":"Dünya Gıda Günü","10-29":"29 Ekim","11-10":"10 Kasım","12-05":"Dünya Toprak Günü","12-11":"Uluslararası Dağlar Günü"}[day.slice(5)];if(special)try{await award("special_day","special:"+day)}catch(err){console.warn("Special-day award",err)}});
 document.addEventListener("nova:areas-synced",async e=>{if((e.detail?.areas||[]).length){} });
})();