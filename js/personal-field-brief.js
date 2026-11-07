/* Personal field intelligence: selected user areas, real sources and optional authenticated NOVA analysis. */
(() => {
  "use strict";
  const root=document.querySelector("[data-personal-brief]");
  if(!root)return;
  const $=s=>root.querySelector(s);
  const isTr=()=>((document.documentElement.dataset.language||localStorage.getItem("nexorawildfire-language-v1")||"tr")==="tr");
  const say=(tr,en)=>isTr()?tr:en;
  const read=(key,fallback=null)=>{try{const value=JSON.parse(localStorage.getItem(key)||"null");return value??fallback}catch{return fallback}};
  const API_BASE=(window.NOVA_API_BASE||(location.hostname.endsWith("github.io")?"https://nova-forest-ai.vercel.app/api":"/api")).replace(/\/$/,"");
  let requestId=0,satelliteRequestId=0;
  const finite=value=>value!==null&&value!==undefined&&value!==""&&Number.isFinite(Number(value));
  function validPoint(point){return Array.isArray(point)&&point.length>=2&&finite(point[0])&&finite(point[1])&&Math.abs(Number(point[0]))<=90&&Math.abs(Number(point[1]))<=180}
  function areaCenter(area){
    const points=Array.isArray(area?.coordinates)?area.coordinates.filter(validPoint):[];
    if(points.length<3)return null;
    return points.reduce((sum,p)=>[sum[0]+Number(p[0]),sum[1]+Number(p[1])],[0,0]).map(v=>v/points.length);
  }
  function selectedContext(){
    const home=read("nexorawildfire-home-v1");
    const areas=read("nexorawildfire-my-areas-v1",[]);
    const list=Array.isArray(areas)?areas:[];
    const preferredId=localStorage.getItem("nexorawildfire-primary-area-v1");
    const primary=list.find(a=>String(a.id)===String(preferredId));
    if(finite(home?.lat)&&finite(home?.lon)&&Math.abs(Number(home.lat))<=90&&Math.abs(Number(home.lon))<=180){
      const matched=primary||list.find(a=>String(a.name||"").trim()===String(home.name||"").trim())||null;
      return {lat:Number(home.lat),lon:Number(home.lon),name:home.name||home.displayName?.split(",")?.[0]||say("Başlangıç alanım","My starting area"),type:home.type||matched?.type||"genel",areas:list,area:matched};
    }
    const area=primary||list[0],center=areaCenter(area);
    if(center)return {lat:center[0],lon:center[1],name:area.name||say("Kayıtlı alanım","My saved area"),type:area.type||"genel",areas:list,area};
    return {lat:null,lon:null,name:say("Kişisel alan seçilmedi","No personal area selected"),type:"genel",areas:list,area:null};
  }
  function profileData(){
    let profile=null;
    try{profile=window.NovaAuth?.profile?.()||null}catch{}
    return profile||read("nexorawildfire-profile-v1",{})||{};
  }
  function updateAreas(context){
    const areas=context?.areas||read("nexorawildfire-my-areas-v1",[]);
    const count=Array.isArray(areas)?areas.length:0,el=$("[data-personal-areas]");
    if(el)el.textContent=say(count+" kayıtlı alan · "+(context?.name||"alan seçilmedi"),count+" saved areas · "+(context?.name||"no area selected"));
  }
  function adviceFor(type,w,soil,et0,rain){
    const t=String(type||"genel").toLocaleLowerCase("tr");
    const dry=finite(w.humidity)&&finite(w.temp)&&Number(w.humidity)<35&&Number(w.temp)>=27;
    const windy=finite(w.wind)&&Number(w.wind)>=25,wet=finite(rain)&&Number(rain)>=3;
    const soilLow=finite(soil)&&Number(soil)<.2,highEt0=finite(et0)&&Number(et0)>4;
    if(t.includes("arı")||t.includes("bee")||t.includes("apiary")){
      if(windy||wet)return say("Rüzgâr veya yağış arı uçuşunu zorlaştırabilir. Kovan çevresindeki yerel koşulları kontrol et; bu gösterge uçuş garantisi değildir.","Wind or rain may limit bee flight. Check conditions at the apiary; this indicator is not a flight guarantee.");
      return say("Mevcut hava daha sakin görünüyor. Uçuş kararı öncesinde kovan çevresindeki rüzgârı, yağışı ve arı davranışını yerinde kontrol et.","Current weather looks calmer. Check local wind, rain and bee activity before making flight decisions.");
    }
    if(t.includes("çift")||t.includes("farm")||t.includes("field")){
      if(soilLow||highEt0||dry)return say("Su stresi açısından dikkat: hava ve model toprak nemi göstergeleri izlenmeli. Sulama kararını tarladaki gerçek nem, ürün ve gelişim evresiyle doğrula.","Watch for possible water stress: review weather and modelled soil-moisture indicators. Confirm irrigation decisions with actual field moisture, crop and growth stage.");
      if(wet)return say("Yağış gözlemi var. Tarla çalışmasını planlarken yerel yağışı, drenajı ve zemin durumunu kontrol et.","Precipitation is observed. Check local rainfall, drainage and field conditions before scheduling work.");
      return say("Hava tek başına sulama ihtiyacını belirlemez. Toprak nemi, ürün türü ve gelişim evresiyle birlikte değerlendir.","Weather alone does not determine irrigation needs. Combine it with soil moisture, crop type and growth stage.");
    }
    if(t.includes("orman")||t.includes("forest")||t.includes("nature")){
      if(dry&&windy)return say("Sıcak, kuru ve rüzgârlı koşullar çevresel dikkat gerektirir. Resmî duyuruları takip et; bu gösterge yangın tespiti veya kesin tahmin değildir.","Warm, dry and windy conditions warrant extra environmental awareness. Follow official notices; this is not fire detection or a definitive forecast.");
      return say("Hava gözlemini uydu bitki sağlığı verileri ve resmî duyurularla birlikte değerlendir. Veri yokluğu risksiz alan anlamına gelmez.","Review weather alongside satellite vegetation information and official notices. Missing data does not mean an area is risk-free.");
    }
    return say("Bugünkü koşulları seçtiğin kullanım amacına göre yorumla. Tarım, arıcılık veya orman katmanını açarak alanına özel ayrıntıları inceleyebilirsin.","Review today's conditions in the context of your chosen activity. Open the agriculture, beekeeping or forest layer for more detail about your area.");
  }
  async function loadSatellite(context){
    const id=++satelliteRequestId,el=$("[data-personal-satellite]");
    if(!el)return;
    const area=context?.area,points=Array.isArray(area?.coordinates)?area.coordinates.filter(validPoint):[];
    if(points.length<3){el.textContent=say("Alan sınırı seçilmedi","No saved area boundary");return}
    const ring=points.map(p=>[Number(p[1]),Number(p[0])]);
    if(ring[0][0]!==ring[ring.length-1][0]||ring[0][1]!==ring[ring.length-1][1])ring.push([...ring[0]]);
    el.textContent=say("Sentinel-2 zaman serisi kontrol ediliyor…","Checking Sentinel-2 time series…");
    try{
      const response=await fetch(API_BASE+"/ndvi/area-timeseries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({geometry:{type:"Polygon",coordinates:[ring]},days:180,interval:"P30D"})});
      const data=await response.json();if(id!==satelliteRequestId)return;
      if(data.status==="available"&&data.latest&&finite(data.latest.ndvi)){
        const ndvi=Number(data.latest.ndvi).toFixed(2),ndmi=finite(data.latest.ndmi)?Number(data.latest.ndmi).toFixed(2):"—";
        el.textContent=say("NDVI "+ndvi+" · NDMI "+ndmi,"NDVI "+ndvi+" · NDMI "+ndmi);
      }else if(data.status==="not_configured")el.textContent=say("Copernicus bağlantısı sunucuda yapılandırılmamış","Copernicus provider is not configured on the server");
      else if(data.status==="available")el.textContent=say("İşlenmiş uydu örneği bulunamadı","No processed satellite samples returned");
      else el.textContent=say("Uydu verisi şu anda alınamıyor","Satellite data is currently unavailable");
    }catch{if(id===satelliteRequestId)el.textContent=say("Uydu kaynağına ulaşılamadı","Satellite source could not be reached")}
  }
  async function runNOVA(){
    const button=$("[data-nova-analyze]"),output=$("[data-nova-report]");
    if(!button||!output)return;
    const context=selectedContext();
    output.hidden=false;
    if(!finite(context.lat)||!finite(context.lon)){output.textContent=say("Önce Alanlarım bölümünden bir başlangıç alanı seç.","Choose a starting area in My Areas first.");return}
    let session=null;try{session=window.NovaAuth?.session?.()||null}catch{}
    if(!session?.access_token){output.textContent=say("NOVA AI raporu için hesabına giriş yapmalısın. Giriş yaptıktan sonra bu düğmeyle gerçek model analizini çağırabilirsin.","Sign in to request a NOVA AI report. After signing in, use this button to call the configured model analysis.");return}
    button.disabled=true;button.textContent=say("NOVA AI kaynakları değerlendiriyor…","NOVA AI is evaluating sources…");
    output.textContent=say("Open-Meteo ve varsa tamamlanmış Sentinel-2 kanıtları güvenli backend üzerinden ajanlara gönderiliyor…","Open-Meteo and any completed Sentinel-2 evidence are being sent to the agents through the secure backend…");
    try{
      const response=await fetch(API_BASE+"/copilot/analyze",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token},body:JSON.stringify({area_name:context.name,lat:context.lat,lon:context.lon})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok){
        const detail=data.detail?.message||data.detail?.message_tr||data.detail||"NOVA AI isteği tamamlanamadı.";
        output.textContent=response.status===503?say("NOVA AI model sağlayıcısı sunucuda henüz yapılandırılmamış. Gerçek model yanıtı alınmadı; mevcut kişisel özet kural tabanlıdır.",String(detail)):String(typeof detail==="string"?detail:JSON.stringify(detail));
        return;
      }
      output.textContent=(data.report||data.agents?.writer?.content||say("Model raporu boş döndü.","The model returned an empty report."))+"\n\n"+say("Kaynak: Open-Meteo"+(data.satellite?.status==="available"?" · Copernicus Sentinel-2 L2A":""),"Sources: Open-Meteo"+(data.satellite?.status==="available"?" · Copernicus Sentinel-2 L2A":""))+" · "+new Date(data.checked_at_utc||Date.now()).toLocaleString(isTr()?"tr-TR":"en-GB")+"\n"+say("Karar desteğidir; resmî uyarı veya kesin tahmin değildir.","Decision support only; not an official alert or definitive forecast.");
    }catch(error){output.textContent=say("NOVA AI servisine ulaşılamadı. Sağlayıcı yapılandırmasını ve bağlantıyı kontrol et; yerel özet kullanılabilir durumda kalır.","NOVA AI service could not be reached. Check provider configuration and connectivity; the local briefing remains available.");}
    finally{button.disabled=false;button.textContent=say("✦ NOVA AI ile ayrıntılı yorumla","✦ Analyze with NOVA AI")}
  }
  async function load(){
    const id=++requestId,context=selectedContext(),profile=profileData();
    const place=$("[data-personal-place]"),weatherEl=$("[data-personal-weather]"),adviceEl=$("[data-personal-advice]"),updated=$("[data-personal-updated]");
    if(place)place.textContent=context.name;
    updateAreas(context);
    const mapLink=$("[data-personal-map-link]");
    if(mapLink)mapLink.href=context.area?.id?"pages/map.html?area="+encodeURIComponent(context.area.id):"pages/map.html";
    loadSatellite(context);
    const title=$("#nx-personal-title"),displayName=String(profile?.full_name||profile?.name||"").trim().split(/\s+/)[0];
    if(title&&displayName)title.textContent=say("Bugün "+displayName+", alanında neler oluyor?","What's happening in your area today, "+displayName+"?");
    if(!finite(context.lat)||!finite(context.lon)){
      if(weatherEl)weatherEl.textContent=say("Kişisel alan seçilmedi","No personal area selected");
      if(adviceEl)adviceEl.textContent=say("Kişisel istihbarat için Alanlarım bölümünden bir tarla, arılık veya orman alanı kaydet ya da başlangıç alanını belirle. Konum izni kendiliğinden istenmez.","Save a field, apiary or forest in My Areas, or choose a starting area to enable personal intelligence. Location permission is not requested automatically.");
      if(updated)updated.textContent=say("Kaynak: Open-Meteo · alan seçimi bekleniyor","Source: Open-Meteo · waiting for an area selection");
      return;
    }
    if(weatherEl)weatherEl.textContent=say("Canlı veri alınıyor…","Loading live data…");
    const url=new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude",String(context.lat));url.searchParams.set("longitude",String(context.lon));
    url.searchParams.set("current","temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,soil_moisture_0_to_7cm");
    url.searchParams.set("daily","et0_fao_evapotranspiration,precipitation_sum");url.searchParams.set("forecast_days","1");url.searchParams.set("timezone","Europe/Istanbul");
    try{
      const response=await fetch(url,{cache:"no-store"});if(!response.ok)throw Error("Open-Meteo HTTP "+response.status);
      const data=await response.json();if(id!==requestId)return;
      const c=data.current||{},d=data.daily||{};
      if(!finite(c.temperature_2m)||!finite(c.relative_humidity_2m)||!finite(c.wind_speed_10m))throw Error("incomplete weather");
      const w={temp:Number(c.temperature_2m),humidity:Number(c.relative_humidity_2m),wind:Number(c.wind_speed_10m),direction:finite(c.wind_direction_10m)?Number(c.wind_direction_10m):null};
      const soil=finite(c.soil_moisture_0_to_7cm)?Number(c.soil_moisture_0_to_7cm):null;
      const et0=finite(d.et0_fao_evapotranspiration?.[0])?Number(d.et0_fao_evapotranspiration[0]):null;
      const rain=finite(d.precipitation_sum?.[0])?Number(d.precipitation_sum[0]):finite(c.precipitation)?Number(c.precipitation):null;
      if(weatherEl)weatherEl.textContent=Math.round(w.temp)+"°C · "+say("Nem ","Humidity ")+Math.round(w.humidity)+"% · "+say("Rüzgâr ","Wind ")+Math.round(w.wind)+" km/sa"+(w.direction===null?"":" · "+Math.round(w.direction)+"°");
      if(adviceEl)adviceEl.textContent=adviceFor(context.type,w,soil,et0,rain);
      if(updated){
        const details=[say("Kaynak: Open-Meteo","Source: Open-Meteo")];
        if(soil!==null)details.push(say("Model toprak nemi ","Modelled soil moisture ")+(soil*100).toFixed(0)+"%");
        if(et0!==null)details.push("ET₀ "+et0.toFixed(1)+" mm");
        if(rain!==null)details.push(say("Günlük yağış ","Daily rain ")+rain.toFixed(1)+" mm");
        details.push(say("Gözlem: ","Observed: ")+new Date(c.time||Date.now()).toLocaleString(isTr()?"tr-TR":"en-GB"));
        updated.textContent=details.join(" · ");
      }
    }catch(error){
      if(id!==requestId)return;
      if(weatherEl)weatherEl.textContent=say("Canlı hava verisi yok","Live weather unavailable");
      if(adviceEl)adviceEl.textContent=say("Kaynak yanıt vermedi. Tahmin üretmek yerine veri yok olarak gösteriliyor; bağlantı sağlandığında yeniden deneyebilirsin.","The source did not respond. The panel shows unavailable data rather than inventing a result; try again when the connection is available.");
      if(updated)updated.textContent=say("Kaynak: Open-Meteo · bağlantı bekleniyor","Source: Open-Meteo · waiting for connection");
    }
  }
  $("[data-nova-analyze]")?.addEventListener("click",runNOVA);
  window.addEventListener("nova:profile-updated",load);
  window.addEventListener("nova:areas-updated",load);
  window.addEventListener("nova:areas-synced",load);
  window.addEventListener("storage",event=>{if(["nexorawildfire-home-v1","nexorawildfire-profile-v1","nexorawildfire-my-areas-v1","nexorawildfire-primary-area-v1"].includes(event.key))load()});
  load();
})();