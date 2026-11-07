/* Personal field intelligence: uses only an explicitly selected home area or saved user areas. */
(() => {
  "use strict";
  const root=document.querySelector("[data-personal-brief]");
  if(!root)return;
  const $=s=>root.querySelector(s);
  const isTr=()=>((document.documentElement.dataset.language||localStorage.getItem("nexorawildfire-language-v1")||"tr")==="tr");
  const say=(tr,en)=>isTr()?tr:en;
  const read=(key,fallback=null)=>{try{const value=JSON.parse(localStorage.getItem(key)||"null");return value??fallback}catch{return fallback}};
  let requestId=0;
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
    if(finite(home?.lat)&&finite(home?.lon)&&Math.abs(Number(home.lat))<=90&&Math.abs(Number(home.lon))<=180){
      return {lat:Number(home.lat),lon:Number(home.lon),name:home.name||home.displayName?.split(",")?.[0]||say("Başlangıç alanım","My starting area"),type:home.type||"genel",areas:list};
    }
    const preferredId=localStorage.getItem("nexorawildfire-primary-area-v1");
    const area=list.find(a=>String(a.id)===String(preferredId))||list[0];
    const center=areaCenter(area);
    if(center)return {lat:center[0],lon:center[1],name:area.name||say("Kayıtlı alanım","My saved area"),type:area.type||"genel",areas:list};
    return {lat:null,lon:null,name:say("Kişisel alan seçilmedi","No personal area selected"),type:"genel",areas:list};
  }
  function profileData(){
    let profile=null;
    try{profile=window.NovaAuth?.profile?.()||null}catch{}
    return profile||read("nexorawildfire-profile-v1",{})||{};
  }
  function updateAreas(context){
    const areas=context?.areas||read("nexorawildfire-my-areas-v1",[]);
    const count=Array.isArray(areas)?areas.length:0;
    const el=$("[data-personal-areas]");
    if(el)el.textContent=say(count+" kayıtlı alan · "+(context?.name||"alan seçilmedi"),count+" saved areas · "+(context?.name||"no area selected"));
  }
  function adviceFor(type,w,soil,et0,rain){
    const t=String(type||"genel").toLocaleLowerCase("tr");
    const dry=finite(w.humidity)&&finite(w.temp)&&Number(w.humidity)<35&&Number(w.temp)>=27;
    const windy=finite(w.wind)&&Number(w.wind)>=25;
    const wet=finite(rain)&&Number(rain)>=3;
    const soilLow=finite(soil)&&Number(soil)<.2;
    const highEt0=finite(et0)&&Number(et0)>4;
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
  async function load(){
    const id=++requestId,context=selectedContext(),profile=profileData();
    const place=$("[data-personal-place]"),weatherEl=$("[data-personal-weather]"),adviceEl=$("[data-personal-advice]"),updated=$("[data-personal-updated]");
    if(place)place.textContent=context.name;
    updateAreas(context);
    const title=$("#nx-personal-title");
    const displayName=String(profile?.full_name||profile?.name||"").trim().split(/\s+/)[0];
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
  window.addEventListener("nova:profile-updated",load);
  window.addEventListener("nova:areas-updated",load);
  window.addEventListener("nova:areas-synced",load);
  window.addEventListener("storage",event=>{if(["nexorawildfire-home-v1","nexorawildfire-profile-v1","nexorawildfire-my-areas-v1","nexorawildfire-primary-area-v1"].includes(event.key))load()});
  load();
})();