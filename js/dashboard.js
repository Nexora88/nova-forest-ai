(function(){
const KEY="nexorawildfire-dashboard-v1";
const places=[
 {name:"Edirne",lat:41.6772,lon:26.5557},
 {name:"KÄ±rklareli",lat:41.7351,lon:27.2252},
 {name:"TekirdaÄŸ",lat:40.9781,lon:27.5110},
 {name:"Ä°stanbul Avrupa",lat:41.0082,lon:28.9784}
];
function risk(w){let s=0;if(w.t>=40)s+=30;else if(w.t>=30)s+=15;else if(w.t>=25)s+=7;if(w.h<=20)s+=25;else if(w.h<=40)s+=10;else if(w.h<=55)s+=4;if(w.wind>=40)s+=25;else if(w.wind>=20)s+=10;else if(w.wind>=12)s+=4;if(w.p>=20)s=Math.max(0,s-12);return Math.min(100,s)}
function word(v){return v>=75?"KRÄ°TÄ°K":v>=50?"YÃœKSEK":v>=25?"ORTA":"DÃœÅÃœK"}
function color(v){return v>=75?"#ff4b3e":v>=50?"#ff9f2f":v>=25?"#ffd34d":"#00ff66"}
function cache(data){localStorage.setItem(KEY,JSON.stringify({savedAt:Date.now(),rows:data}))}
function read(){try{return JSON.parse(localStorage.getItem(KEY)||"null")}catch{return null}}
async function load(){
 const old=read();
 let rows=null,live=false;
 try{
  const u=new URL("https://api.open-meteo.com/v1/forecast");
  u.searchParams.set("latitude",places.map(x=>x.lat).join(","));
  u.searchParams.set("longitude",places.map(x=>x.lon).join(","));
  u.searchParams.set("current","temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation");
  u.searchParams.set("timezone","Europe/Istanbul");
  const j=await fetch(u,{cache:"no-store"}).then(r=>r.json());
  const arr=Array.isArray(j)?j:[j];
  rows=arr.map((q,i)=>{const c=q.current||{};const w={t:+(c.temperature_2m||0),h:+(c.relative_humidity_2m||0),wind:+(c.wind_speed_10m||0),p:+(c.precipitation||0)};return{...places[i],w,risk:risk(w)}});cache(rows);live=true;
 }catch{rows=old?.rows||[]}
 render(rows,live,live?Date.now():(old?.savedAt||Date.now()));
}
function render(rows,live,savedAt){
 const best=[...rows].sort((a,b)=>b.risk-a.risk)[0];
 const el=s=>document.querySelector(s);
 if(el("[data-highest-risk]"))el("[data-highest-risk]").innerHTML=best?best.name+' <b style="color:'+color(best.risk)+'">'+best.risk+'/100</b>':"Veri yok";
 if(el("[data-update-time]"))el("[data-update-time]").textContent=live?"Åimdi â€¢ canlÄ± veri":new Date(savedAt).toLocaleString("tr-TR")+" â€¢ son geÃ§erli kayÄ±t";
 if(el("[data-network-state]"))el("[data-network-state]").textContent=live?"CANLI VERÄ°":"Ã‡EVRÄ°MDIÅI â€¢ SON VERÄ°";
 const list=el("[data-region-risks]");
 if(list)list.innerHTML=rows.map(r=>'<div class="region-risk-card"><strong>'+r.name+'</strong><span style="color:'+color(r.risk)+'">'+word(r.risk)+' Â· '+r.risk+'/100</span><small>'+r.w.t+'Â°C Â· nem '+r.w.h+'% Â· rÃ¼zgar '+r.w.wind+' km/s</small></div>').join("");
 if(el("[data-breakdown]")&&best){
  const weather=Math.min(100,best.risk);
  const satellite=0;
  el("[data-breakdown]").innerHTML='<div class="breakdown-row"><span>Hava / atmosfer</span><b>'+weather+'%</b></div><div class="breakdown-track"><i style="width:'+weather+'%"></i></div><div class="breakdown-row"><span>Uydu NDVI</span><b>'+satellite+'%</b></div><div class="breakdown-track"><i style="width:'+satellite+'%"></i></div><small>NDVI gerÃ§ek Sentinel-2 zaman serisi backend ile mevcut olduÄŸunda ayrÄ± bileÅŸen olarak gÃ¶sterilir. Eksik veri sÄ±fÄ±r katkÄ± kabul edilir; tahmin edilmez.</small>';
 }
}
document.addEventListener("DOMContentLoaded",()=>{
 const box=document.createElement("section");box.className="nova-dashboard";
 box.innerHTML='<div class="dashboard-head"><div><div class="eyebrow">NEXORAWILDFIRE / OPERASYON Ã–ZETÄ°</div><h2>Durumu haritaya girmeden gÃ¶r.</h2></div><span data-network-state>VERÄ° BEKLENÄ°YOR</span></div><div class="dashboard-grid"><article><small>EN YÃœKSEK RÄ°SKLÄ° BÃ–LGE</small><h3 data-highest-risk>HesaplanÄ±yorâ€¦</h3><p>Marmara odaÄŸÄ±ndaki seÃ§ili bÃ¶lgeler arasÄ±nda mevcut meteorolojik risk sinyali.</p></article><article><small>SON GÃœNCELLEME</small><h3 data-update-time>HesaplanÄ±yorâ€¦</h3><p>CanlÄ± veri yoksa son geÃ§erli yerel kayÄ±t gÃ¶sterilir.</p></article></div><div class="region-risk-list" data-region-risks></div><div class="science-box"><div><div class="eyebrow">BÄ°LÄ°MSEL ÅEFFAFLIK</div><h3>Risk skoru nasÄ±l oluÅŸuyor?</h3><p>Hava bileÅŸeni sÄ±caklÄ±k, baÄŸÄ±l nem, rÃ¼zgar ve yaÄŸÄ±ÅŸtan oluÅŸan aÃ§Ä±klanabilir bir karar destek sinyalidir. Uydu bileÅŸeni yalnÄ±zca gerÃ§ek NDVI geldiÄŸinde eklenir.</p></div><div data-breakdown></div></div>';
 const mapSection=document.querySelector(".map-section");if(mapSection)mapSection.parentNode.insertBefore(box,mapSection);
 load();setInterval(load,300000);
});
})();
