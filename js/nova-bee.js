(() => {
 const $=id=>document.getElementById(id), AREA_KEY="nexorawildfire-my-areas-v1", PREF_KEY="nexora-bee-preferences-v1", api=(window.NOVA_API_BASE||"/api").replace(/\/$/,"");
 let areas=[],selected=null,latest=null;
 const num=v=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v));
 const safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const prefs=()=>{try{return JSON.parse(localStorage.getItem(PREF_KEY)||"{}")}catch{return {}}};
 function savePrefs(){const p={frost:Math.max(-10,Math.min(8,Number($("frost-threshold").value||2))),kc:Math.max(.1,Math.min(1.5,Number($("crop-coefficient").value||.8))),areaId:selected?String(selected.id):""};localStorage.setItem(PREF_KEY,JSON.stringify(p));$("notification-status").textContent="Ayarlar bu cihazda kaydedildi.";return p}
 function center(a){const pts=Array.isArray(a?.coordinates)?a.coordinates:[],v=pts.filter(p=>Array.isArray(p)&&p.length>=2&&num(p[0])&&num(p[1]));if(v.length<3)return null;return[v.reduce((s,p)=>s+Number(p[0]),0)/v.length,v.reduce((s,p)=>s+Number(p[1]),0)/v.length]}
 function geometry(a){const pts=(a.coordinates||[]).filter(p=>Array.isArray(p)&&p.length>=2&&num(p[0])&&num(p[1])).map(p=>[Number(p[1]),Number(p[0])]);if(pts.length<3)throw Error("Alan sınırı NDVI için yeterli koordinat içermiyor.");if(pts[0][0]!==pts[pts.length-1][0]||pts[0][1]!==pts[pts.length-1][1])pts.push([...pts[0]]);return{type:"Polygon",coordinates:[pts]}}
 function status(msg,kind=""){$("bee-status").className="bee-status"+(kind?" is-"+kind:"");$("bee-status").textContent=msg}
 function loadAreas(){try{const v=JSON.parse(localStorage.getItem(AREA_KEY)||"[]");areas=Array.isArray(v)?v.filter(a=>a&&Array.isArray(a.coordinates)&&a.coordinates.length>=3):[]}catch{areas=[]}const s=$("area-select"),p=prefs();s.innerHTML='<option value="">Bir alan seç…</option>'+areas.map(a=>'<option value="'+safe(a.id)+'">'+safe(a.name)+' · '+safe(a.type||"alan")+'</option>').join("");if(!areas.length){status("Kayıtlı alan bulunamadı. Önce Alanlarım bölümünden arılık veya tarla ekle.","error");$("active-area-name").textContent="Alan seçilmedi";return}const a=areas.find(x=>String(x.id)===String(p.areaId))||areas[0];s.value=String(a.id);chooseArea(a,false)}
 function chooseArea(a,fetchNow=true){selected=a||null;if(!selected){$("active-area-name").textContent="Alan seçilmedi";$("active-area-location").textContent="Önce bir alan kaydet.";return}const c=center(selected);$("active-area-name").textContent=selected.name||"Kayıtlı alan";$("active-area-location").textContent=[selected.district,selected.province,selected.type].filter(Boolean).join(" · ")||(c?c[0].toFixed(3)+", "+c[1].toFixed(3):"Konum eksik");const p=prefs();$("frost-threshold").value=num(p.frost)?p.frost:2;$("crop-coefficient").value=num(p.kc)?p.kc:.8;savePrefs();if(fetchNow)refresh()}
 async function refresh(){if(!selected){status("Hava tahmini için kayıtlı bir alan seç.","error");return}const c=center(selected);if(!c||Math.abs(c[0])>90||Math.abs(c[1])>180){status("Alan koordinatları geçerli değil; sonuç üretilmedi.","error");return}$("refresh").disabled=true;$("refresh").textContent="Yükleniyor…";status("Open-Meteo tahmini alınıyor…");try{const u=new URL("https://api.open-meteo.com/v1/forecast");u.searchParams.set("latitude",c[0]);u.searchParams.set("longitude",c[1]);u.searchParams.set("current","temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation");u.searchParams.set("daily","temperature_2m_min,temperature_2m_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration");u.searchParams.set("forecast_days","7");u.searchParams.set("timezone","Europe/Istanbul");const r=await fetch(u,{cache:"no-store"});if(!r.ok)throw Error("Hava sağlayıcısı HTTP "+r.status);const b=await r.json();if(b.error||!b.daily?.time?.length)throw Error(b.reason||"Günlük tahmin alanları eksik.");latest=b;render(b);status("Tahmin alındı. Göstergeler bu alanın koordinatına ve sağlayıcının günlük tahminine dayanır.","good");$("weather-stamp").textContent="Son kontrol: "+new Date().toLocaleString("tr-TR")+" · Open-Meteo";evaluateNotifications(b)}catch(e){latest=null;status("Veri alınamadı: "+(e?.message||"bağlantı hatası")+". Eksik veri yerine puan üretilmedi.","error");$("weather-stamp").textContent="Veri sağlayıcısına ulaşılamadı";["frost","flight","water"].forEach(k=>{$(k+"-title").textContent="Veri yok";$(k+"-value").textContent="—"});$("forecast-grid").innerHTML='<div class="bee-empty">Tahmin alınamadı. Bağlantı sağlandığında yeniden deneyebilirsin.</div>'}finally{$("refresh").disabled=false;$("refresh").textContent="Veriyi yenile"}}
 function render(b){const d=b.daily,c=b.current||{},p=prefs(),threshold=num($("frost-threshold").value)?Number($("frost-threshold").value):2,mins=d.temperature_2m_min||[],maxs=d.temperature_2m_max||[],rain=d.precipitation_sum||[],probs=d.precipitation_probability_max||[],winds=d.wind_speed_10m_max||[],et0=d.et0_fao_evapotranspiration||[],valid=mins.filter(num).map(Number);if(valid.length){const min=Math.min(...valid),day=d.time[mins.findIndex(v=>num(v)&&Number(v)===min)]||"";$("frost-title").textContent=min<=threshold?"Don eşiği aşılabilir":"Eşik altında sinyal yok";$("frost-value").textContent=min.toFixed(1)+"°C";$("frost-copy").textContent=(day?new Date(day+"T12:00:00").toLocaleDateString("tr-TR",{weekday:"long",day:"numeric",month:"short"})+" günü ":"")+"tahmin edilen en düşük sıcaklık. Eşik: "+threshold+"°C. Mikroiklim farkları mümkündür."}else{$("frost-title").textContent="Veri yok";$("frost-value").textContent="—"}if(num(c.temperature_2m)&&num(c.wind_speed_10m)&&num(c.precipitation)){const t=Number(c.temperature_2m),w=Number(c.wind_speed_10m),r=Number(c.precipitation);let s=100;if(t<14||t>34)s-=30;if(w>25)s-=35;else if(w>15)s-=15;if(r>1)s-=35;s=Math.max(0,Math.min(100,s));$("flight-title").textContent=s>=75?"Görece elverişli sinyal":s>=45?"Koşulları izle":"Uçuş için elverişsiz sinyal";$("flight-value").textContent=s+"/100";$("flight-copy").textContent="Şu an "+t.toFixed(1)+"°C, "+w.toFixed(1)+" km/sa rüzgâr, "+r.toFixed(1)+" mm yağış. Basit kural tabanlı gösterge; arı uçuşunu garanti etmez."}else{$("flight-title").textContent="Veri yok";$("flight-value").textContent="—";$("flight-copy").textContent="Gerekli güncel hava alanları sağlayıcı yanıtında bulunamadı."}const demand=num(et0[0])?Number(et0[0])*(num(p.kc)?Number(p.kc):.8):null,rr=num(rain[0])?Number(rain[0]):null;if(demand!==null&&rr!==null){const net=Math.max(0,demand-rr);$("water-title").textContent=net>=3?"Sulama ihtiyacını kontrol et":"Yakın dönem talebi düşük";$("water-value").textContent=net.toFixed(1)+" mm";$("water-copy").textContent="Yaklaşık günlük bitki talebi (ET₀ × Kc) eksi tahmini yağış. Etkili yağış, toprak nemi ve sulama verimi hesaba katılmadı; sulama emri değildir."}else{$("water-title").textContent="Veri yok";$("water-value").textContent="—";$("water-copy").textContent="ET₀ veya yağış verisi yok; tahmin yapılmadı."}$("forecast-grid").innerHTML=d.time.map((day,i)=>{const lo=num(mins[i])?Number(mins[i]):null,hi=num(maxs[i])?Number(maxs[i]):null,f=lo!==null&&lo<=threshold;return'<article class="bee-day '+(f?"is-frost":"")+'"><time>'+new Date(day+"T12:00:00").toLocaleDateString("tr-TR",{weekday:"short",day:"numeric",month:"short"})+'</time><strong>'+(hi===null?"—":hi.toFixed(0)+"°")+'</strong><span>En düşük '+(lo===null?"—":lo.toFixed(1)+"°")+'</span><span>Yağış '+(num(rain[i])?Number(rain[i]).toFixed(1)+" mm":"—")+'</span><small>Yağış olasılığı '+(num(probs[i])?Number(probs[i])+"%":"—")+'</small><small>Rüzgâr '+(num(winds[i])?Number(winds[i]).toFixed(0)+" km/sa":"—")+'</small>'+(f?"<em>Don eşiği</em>":"")+"</article>"}).join("");renderCopilot(b)}
 function renderCopilot(b){
  const host=$("copilot-agents"),summary=$("copilot-summary");
  if(!host||!summary||!selected)return;
  const d=b.daily||{},mins=(d.temperature_2m_min||[]).filter(num).map(Number),rain=(d.precipitation_sum||[]),et0=(d.et0_fao_evapotranspiration||[]),threshold=num($("frost-threshold").value)?Number($("frost-threshold").value):2,kc=num($("crop-coefficient").value)?Number($("crop-coefficient").value):.8;
  const frostDay=(d.temperature_2m_min||[]).findIndex(v=>num(v)&&Number(v)<=threshold),min=mins.length?Math.min(...mins):null,firstRain=num(rain[0])?Number(rain[0]):null,firstEt0=num(et0[0])?Number(et0[0]):null,net=firstEt0!==null&&firstRain!==null?Math.max(0,firstEt0*kc-firstRain):null;
  const eco=min===null?"Yeterli minimum sıcaklık verisi yok.":min<=threshold?"Don eşiği riski: "+min.toFixed(1)+"°C tahmin edilen en düşük değer; "+(d.time?.[frostDay]||"ilgili gün")+" için saha koşullarını kontrol et.":"Tahminde seçtiğin "+threshold+"°C don eşiği aşılmıyor.";
  const agro=net===null?"ET₀ veya yağış verisi eksik; sulama sinyali üretilemedi.":"ET₀ × Kc − yağış hesabı yaklaşık "+net.toFixed(1)+" mm net atmosferik talep gösteriyor. Toprak nemi ve ürün evresiyle doğrula.";
  const bee=(num(b.current?.temperature_2m)&&num(b.current?.wind_speed_10m)&&num(b.current?.precipitation))?"Mevcut hava: "+Number(b.current.temperature_2m).toFixed(1)+"°C, rüzgâr "+Number(b.current.wind_speed_10m).toFixed(0)+" km/sa, yağış "+Number(b.current.precipitation).toFixed(1)+" mm; bu yalnızca uçuş koşulu sinyalidir.":"Arı uçuşu için gerekli güncel hava verileri eksik.";
  const advice=[];
  if(min!==null&&min<=threshold)advice.push("Don hassasiyeti olan ürün ve yerel mikroiklimi kontrol et.");
  if(net!==null&&net>=3)advice.push("Sulama kararı öncesi toprak nemini ve yakın dönem yağışı doğrula.");
  if(firstRain!==null&&firstRain>=5)advice.push("Beklenen yağış nedeniyle saha işlerini ve su planını yeniden değerlendir.");
  if(!advice.length)advice.push("Mevcut tahminde eşik tabanlı belirgin bir işlem sinyali oluşmadı; bu, risk olmadığı anlamına gelmez.");
  summary.textContent=(selected.name||"Seçili sahan")+" için "+new Date().toLocaleDateString("tr-TR")+" günlük özeti: "+advice.join(" ");
  const card=(label,title,copy,note)=>'<article class="bee-card"><div class="bee-card-top"><span>'+label+'</span></div><h3>'+safe(title)+'</h3><p>'+safe(copy)+'</p>'+(note?'<small class="bee-note">'+safe(note)+'</small>':'')+'</article>';
  host.innerHTML=card("ECO / ÇEVRE AJANI",min!==null&&min<=threshold?"Don eşiğini izle":"Hava ve don kontrolü",eco,"Kaynak: Open-Meteo; tahmin mikroiklim ölçümü değildir.")+card("AGRO / TARIM AJANI",net!==null&&net>=3?"Sulama kontrolü":"Su talebi özeti",agro,"Uydu NDVI/NDMI verisi otomatik varsayılmaz.")+card("NOVA BEE / ARICILIK","Uçuş koşulu sinyali",bee,"Koloni sağlığı veya polen ölçümü değildir.");
 }
 function evaluateNotifications(b){if(!("Notification"in window)||Notification.permission!=="granted")return;const p=prefs(),th=num(p.frost)?Number(p.frost):2,mins=b.daily?.temperature_2m_min||[],min=mins.filter(num).map(Number).reduce((a,x)=>Math.min(a,x),Infinity),day=b.daily?.time?.[mins.findIndex(v=>num(v)&&Number(v)===min)]||"";if(Number.isFinite(min)&&min<=th){const key="frost|"+String(selected?.id)+"|"+day+"|"+th;if(localStorage.getItem("nova-bee-last-notice")!==key){try{new Notification("Nova Bee · Don riski",{body:(selected?.name||"Alanınız")+" için "+day+" günü minimum "+min.toFixed(1)+"°C tahmini. Saha koşullarını kontrol et."});localStorage.setItem("nova-bee-last-notice",key)}catch{}}}}
 async function enableNotifications(){if(!("Notification"in window)){$("notification-status").textContent="Bu tarayıcı bildirim API'sini desteklemiyor.";return}try{const p=await Notification.requestPermission();$("notification-status").textContent=p==="granted"?"İzin verildi. Bildirimler yalnızca sayfa açıkken tahmin kontrol edildiğinde değerlendirilir.":"Bildirim izni verilmedi.";if(p==="granted"&&latest)evaluateNotifications(latest)}catch{$("notification-status").textContent="Bildirim izni alınamadı."}}
 const channelStorageKey="nova-alert-channel-contact-v1";
 function selectedCenter(){
  const points=selected?.coordinates||selected?.vertices||selected?.polygon||[];
  if(!Array.isArray(points)||!points.length)return null;
  const valid=points.filter(p=>Array.isArray(p)&&Number.isFinite(Number(p[0]))&&Number.isFinite(Number(p[1])));
  if(!valid.length)return null;
  return {lat:valid.reduce((sum,p)=>sum+Number(p[0]),0)/valid.length,lon:valid.reduce((sum,p)=>sum+Number(p[1]),0)/valid.length};
 }
 async function subscribeAlertChannel(){
  const status=$("channel-status"),button=$("channel-subscribe"),session=window.NovaAuth?.session?.();
  if(!selected){status.textContent="Önce bir saha seç.";return}
  if(!session?.access_token){status.textContent="Bildirim tercihi için önce hesabına giriş yap.";window.NovaAuth?.requireAccount?.("../pages/bee.html");return}
  const center=selectedCenter();if(!center){status.textContent="Seçili alanın koordinatları okunamadı; Alanlarım ekranında alan geometrisini kontrol et.";return}
  const phone=$("alert-phone").value.trim(),channel=$("alert-channel").value,threshold=Number($("channel-risk-threshold").value||70);
  if(!$("channel-consent").checked){status.textContent="Etkinleştirmek için açık onay kutusunu işaretle.";return}
  if(!/^\+[1-9][0-9]{7,14}$/.test(phone){status.textContent="Telefonu +905xxxxxxxxx biçiminde gir.";return}
  button.disabled=true;status.textContent="Onaylı kanal tercihi güvenli biçimde kaydediliyor…";
  try{
   const r=await fetch(api+"/notifications/channels/subscribe",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token},body:JSON.stringify({channel,phone_e164:phone,lat:center.lat,lon:center.lon,area_name:selected.name||"Seçili saha",threshold,consent:true})});
   const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(typeof d.detail==="string"?d.detail:(d.detail?.message||"HTTP "+r.status));
   const contact=d.contact||{};if(contact.id){localStorage.setItem(channelStorageKey,JSON.stringify({id:contact.id,channel,area_name:selected.name||"Seçili saha"}));$("channel-unsubscribe").hidden=false}
   status.textContent=channel.toUpperCase()+" tercihi kaydedildi. Bildirimler yapılandırılmış zamanlayıcı çalıştığında ve eşik aşıldığında gönderilir.";
  }catch(e){status.textContent="Bildirim açılamadı: "+(e?.message||"servis hatası")+". Supabase migration, Twilio ve zamanlayıcı yapılandırmasını kontrol et."}
  finally{button.disabled=false}
 }
 async function unsubscribeAlertChannel(){
  const status=$("channel-status"),session=window.NovaAuth?.session?.();let saved=null;
  try{saved=JSON.parse(localStorage.getItem(channelStorageKey)||"null")}catch{}
  if(!saved?.id){status.textContent="Bu cihazda iptal edilecek kanal kaydı bulunamadı.";return}
  if(!session?.access_token){status.textContent="İptal için hesabına giriş yap.";return}
  const button=$("channel-unsubscribe");button.disabled=true;
  try{const r=await fetch(api+"/notifications/channels/unsubscribe",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token},body:JSON.stringify({contact_id:saved.id})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(typeof d.detail==="string"?d.detail:"HTTP "+r.status);localStorage.removeItem(channelStorageKey);button.hidden=true;status.textContent="Bu cihazdaki kanal aboneliği iptal edildi."}
  catch(e){status.textContent="İptal tamamlanamadı: "+(e?.message||"servis hatası")}
  finally{button.disabled=false}
 }
 async function requestAgentReport(){
  const statusBox=$("agent-report-status"),reportBox=$("agent-report-text"),button=$("generate-agent-report");
  if(!selected){statusBox.textContent="Önce Alanlarım bölümünden bir saha seç.";return}
  const session=window.NovaAuth?.session?.();
  if(!session?.access_token){statusBox.textContent="Model raporu için giriş yapmalısın.";window.NovaAuth?.requireAccount?.("../pages/bee.html");return}
  if(!latest){statusBox.textContent="Önce güncel hava verisinin yüklenmesini bekle.";return}
  button.disabled=true;button.textContent="Üç ajan çalışıyor…";statusBox.textContent="Agro-Agent ve Eco-Agent analiz ediyor; Writer Agent raporu birleştiriyor.";reportBox.hidden=true;
  try{
    const current=latest.current||{},daily=latest.daily||{};
    const response=await fetch(api+"/copilot/report",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token},body:JSON.stringify({area_name:selected.name||"Seçili saha",latitude:selected.lat??selected.latitude??null,longitude:selected.lon??selected.longitude??null,weather:{current,daily,source:"Open-Meteo",retrieved_at:new Date().toISOString()},ndvi_timeseries:[],soil_observations:{status:"not_provided"},notes:""})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(typeof data.detail==="string"?data.detail:(data.detail?.message||data.detail?.code||("HTTP "+response.status)));
    reportBox.textContent=data.report||"Rapor sağlayıcıdan boş döndü.";reportBox.hidden=false;
    statusBox.textContent="Gerçek model raporu oluşturuldu. Model adları ve ajan durumları aşağıda gösteriliyor.";
    const host=$("copilot-agents");
    if(host&&Array.isArray(data.agents)){host.innerHTML=data.agents.map(a=>'<article class="bee-card"><div class="bee-card-top"><span>'+safe(a.name||a.agent||"Ajan")+'</span></div><h3>'+safe(a.model||"Model bilgisi yok")+'</h3><p>'+safe(a.finding||"Rapor birleştirici ajan tarafından kullanıldı.")+'</p><small class="bee-note">Durum: '+safe(a.status||"ok")+'</small></article>').join("")}
  }catch(error){statusBox.textContent="Gerçek ajan raporu üretilemedi: "+(error?.message||"servis hatası")+". Sunucuda üç ajan için sağlayıcı URL'si, model adı ve API anahtarı yapılandırılmış olmalı."}
  finally{button.disabled=false;button.textContent="Üç ajanla rapor oluştur"}
 }
 async function loadBillingStatus(){
  const status=$("billing-status"),button=$("billing-checkout");if(!status||!button)return;
  try{const r=await fetch(api+"/billing/status"),d=await r.json();const ready=Boolean(r.ok&&d.checkout_configured&&d.webhook_configured);button.disabled=!ready;status.textContent=ready?"Stripe ödeme bağlantısı hazır. Abonelik yalnızca doğrulanmış webhook sonrası etkinleşir.":"Stripe fiyatı, sunucu anahtarı ve webhook sırrı yapılandırılmadı; ödeme şu an kapalı."; }
  catch{button.disabled=true;status.textContent="Ödeme durumu kontrol edilemedi; ödeme kapalı."}
 }
 async function requestCheckout(){
  const status=$("billing-status"),button=$("billing-checkout"),session=window.NovaAuth?.session?.();
  if(!session?.access_token){status.textContent="Abonelik işlemi için önce hesabına giriş yap.";window.NovaAuth?.requireAccount?.("../pages/bee.html");return}
  button.disabled=true;status.textContent="Güvenli ödeme oturumu oluşturuluyor…";
  try{const r=await fetch(api+"/billing/checkout",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token},body:JSON.stringify({plan:"pro"})}),d=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(typeof d.detail==="string"?d.detail:(d.detail?.message||"HTTP "+r.status));
   if(!d.url||!d.url.startsWith("https://checkout.stripe.com/"))throw Error("Ödeme sağlayıcısından güvenli bağlantı alınamadı.");
   window.location.assign(d.url);
  }catch(e){status.textContent="Ödeme başlatılamadı: "+(e?.message||"servis hatası");button.disabled=false}
 }
 async function requestNDVI(){
  const box=$("ndvi-status");
  if(!selected){box.textContent="Önce bir alan seç.";return}
  const session=window.NovaAuth?.session?.();
  if(!session?.access_token){box.textContent="Özel rapor isteği için önce hesabına giriş yap.";window.NovaAuth?.requireAccount?.("../pages/bee.html");return}
  const btn=$("ndvi-request");btn.disabled=true;btn.textContent="İstek gönderiliyor…";box.textContent="Alan sınırı ve oturum doğrulanıyor…";
  try{
   const response=await fetch(api+"/jobs/ndvi-timeseries",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token},body:JSON.stringify({geometry:geometry(selected),days:180,interval:"P30D"})});
   const payload=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(payload.detail?.message||payload.detail||payload.message||("HTTP "+response.status));
   const id=payload.job_id||payload.id||payload.job?.id;
   if(!id){box.textContent="İstek kabul edildi ancak görev kimliği dönmedi: "+JSON.stringify(payload).slice(0,350);return}
   localStorage.setItem("nova-bee-last-ndvi-job",String(id));
   box.textContent="Görev kuyruğa alındı ("+id+"). Sentinel-2 istatistikleri bekleniyor…";
   for(let attempt=0;attempt<18;attempt++){
    await new Promise(resolve=>setTimeout(resolve,5000));
    const poll=await fetch(api+"/jobs/"+encodeURIComponent(String(id)),{headers:{"Authorization":"Bearer "+session.access_token,"Accept":"application/json"}});
    const job=await poll.json().catch(()=>({}));
    if(!poll.ok)throw Error(job.detail?.message||job.detail||("Görev durumu HTTP "+poll.status));
    const state=String(job.status||job.state||job.job?.status||"").toLowerCase();
    if(["completed","complete","succeeded","success","finished"].includes(state)){
      const result=job.result||job.output||job.job?.result||job.job?.output||job;
      const series=result.series||result.data?.series||result.report?.series||[];
      const latest=result.latest||result.data?.latest||series[series.length-1];
      const delta=result.delta||result.data?.delta||{};
      let report="Sentinel-2 raporu tamamlandı. Görev: "+id+".";
      if(latest)report+=" Son ölçüm: "+(latest.from||latest.to||latest.date||"tarih belirtilmedi")+", NDVI "+(latest.ndvi??"—")+", NDMI "+(latest.ndmi??"—")+", sınıf "+(latest.classification||"belirtilmedi")+".";
      if(delta.ndvi!==undefined&&delta.ndvi!==null)report+=" Önceki ölçüme göre NDVI değişimi: "+delta.ndvi+".";
      if(!latest)report+=" Sağlayıcı sonucu: "+JSON.stringify(result).slice(0,700);
      box.textContent=report+" Kaynak ve örnek sayısı görev yanıtında doğrulanmalıdır.";
      return;
    }
    if(["failed","error","cancelled","canceled"].includes(state))throw Error(job.error||job.message||"Uydu görevi başarısız oldu.");
    box.textContent="Sentinel-2 görevi çalışıyor… ("+(attempt+1)+"/18) · "+id;
   }
   box.textContent="Görev hâlâ çalışıyor. Kimlik: "+id+". Bu ekran açık kaldığında yeniden istek oluşturma; görev durumu sunucuda tutuluyor.";
  }catch(e){box.textContent="Uydu raporu şu an tamamlanamadı: "+(e?.message||"servis hatası")+". Worker, CDSE sağlayıcısı veya hesap kotası hazır olmayabilir."}
  finally{btn.disabled=false;btn.textContent="Özel rapor iste"}
 }
 $("area-select").addEventListener("change",e=>chooseArea(areas.find(a=>String(a.id)===e.target.value)||null));$("refresh").addEventListener("click",refresh);$("save-settings").addEventListener("click",()=>{savePrefs();if(latest)render(latest);status("Don eşiği ve Kc kaydedildi. Sulama sinyali bitki türü ve saha ölçümüyle doğrulanmalıdır.","good")});$("enable-notifications").addEventListener("click",enableNotifications);$("ndvi-request").addEventListener("click",requestNDVI);$("billing-checkout")?.addEventListener("click",requestCheckout);$("generate-agent-report")?.addEventListener("click",requestAgentReport);$("channel-subscribe")?.addEventListener("click",subscribeAlertChannel);$("channel-unsubscribe")?.addEventListener("click",unsubscribeAlertChannel);window.addEventListener("nova:areas-synced",loadAreas);window.addEventListener("nova:auth-ready",()=>{if(!areas.length)loadAreas()});const p=prefs();if(num(p.frost))$("frost-threshold").value=p.frost;if(num(p.kc))$("crop-coefficient").value=p.kc;loadAreas();loadBillingStatus();
})();