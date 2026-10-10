(function(){
const KEY="nexorawildfire-dashboard-v1";
const places=[
 {name:"Edirne",lat:41.6772,lon:26.5557},
 {name:"Kırklareli",lat:41.7351,lon:27.2252},
 {name:"Tekirdağ",lat:40.9781,lon:27.5110},
 {name:"İstanbul Avrupa",lat:41.0082,lon:28.9784}
];
function risk(w){let s=0;if(w.t>=40)s+=30;else if(w.t>=30)s+=15;else if(w.t>=25)s+=7;if(w.h<=20)s+=25;else if(w.h<=40)s+=10;else if(w.h<=55)s+=4;if(w.wind>=40)s+=25;else if(w.wind>=20)s+=10;else if(w.wind>=12)s+=4;if(w.p>=20)s=Math.max(0,s-12);return Math.min(100,s)}
function word(v){return v>=75?"KRİTİK":v>=50?"YÜKSEK":v>=25?"ORTA":"DÜŞÜK"}
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
 const best=[...rows].sort((a,b)=>b.risk-a.risk || a.w.h-b.w.h || b.w.t-a.w.t || b.w.wind-a.w.wind || a.name.localeCompare(b.name,"tr"))[0];
 const el=s=>document.querySelector(s);
 if(el("[data-highest-risk]"))el("[data-highest-risk]").innerHTML=best?best.name+' <b style="color:'+color(best.risk)+'">'+best.risk+'/100</b>':"Veri yok";
 if(el("[data-update-time]"))el("[data-update-time]").textContent=live?"Şimdi • canlı veri":new Date(savedAt).toLocaleString("tr-TR")+" • son geçerli kayıt";
 if(el("[data-network-state]"))el("[data-network-state]").textContent=live?"CANLI VERİ":"ÇEVRİMDIŞI • SON VERİ";
 const list=el("[data-region-risks]");
 if(list)list.innerHTML=rows.map(r=>'<div class="region-risk-card"><strong>'+r.name+'</strong><span style="color:'+color(r.risk)+'">'+word(r.risk)+' · '+r.risk+'/100</span><small>'+r.w.t+'°C · nem '+r.w.h+'% · rüzgar '+r.w.wind+' km/s</small></div>').join("");
 if(el("[data-breakdown]")&&best){
  const weather=Math.min(100,best.risk);
  const satellite=0;
  el("[data-breakdown]").innerHTML='<div class="breakdown-row"><span>Hava / atmosfer</span><b>'+weather+'%</b></div><div class="breakdown-track"><i style="width:'+weather+'%"></i></div><div class="breakdown-row"><span>Uydu NDVI</span><b>'+satellite+'%</b></div><div class="breakdown-track"><i style="width:'+satellite+'%"></i></div><small>NDVI gerçek Sentinel-2 zaman serisi backend ile mevcut olduğunda ayrı bileşen olarak gösterilir. Eksik veri sıfır katkı kabul edilir; tahmin edilmez.</small>';
 }
}
document.addEventListener("DOMContentLoaded",()=>{
 const box=document.createElement("section");box.className="nova-dashboard";
 box.innerHTML='<div class="dashboard-head"><div><div class="eyebrow">NEXORAWILDFIRE / OPERASYON ÖZETİ</div><h2>Durumu haritaya girmeden gör.</h2></div><span data-network-state>VERİ BEKLENİYOR</span></div><div class="dashboard-grid"><article><small>EN YÜKSEK RİSKLİ BÖLGE</small><h3 data-highest-risk>Hesaplanıyor…</h3><p>Skor eşitse önce daha düşük bağıl nem, ardından daha yüksek sıcaklık ve rüzgâr karşılaştırılır. Bu, meteorolojik önceliklendirmedir; doğrulanmış yangın bildirimi değildir.</p></article><article><small>SON GÜNCELLEME</small><h3 data-update-time>Hesaplanıyor…</h3><p>Canlı veri yoksa son geçerli yerel kayıt gösterilir.</p></article></div><div class="region-risk-list" data-region-risks></div><div class="science-box"><div><div class="eyebrow">BİLİMSEL ŞEFFAFLIK</div><h3>Risk skoru nasıl oluşuyor?</h3><p>Hava bileşeni sıcaklık, bağıl nem, rüzgar ve yağıştan oluşan açıklanabilir bir karar destek sinyalidir. Uydu bileşeni yalnızca gerçek NDVI geldiğinde eklenir.</p></div><div data-breakdown></div></div>';
 const mapSection=document.querySelector(".map-section");if(mapSection)mapSection.parentNode.insertBefore(box,mapSection);
 load();setInterval(load,300000);
});
})();