/* Nexora Insight Engine: deterministic and explainable; no fabricated data and no external LLM dependency. */
(() => {
  "use strict";
  const API_BASE = (window.NOVA_API_BASE || (location.hostname.endsWith("github.io") ? "https://nova-forest-ai.vercel.app/api" : "/api")).replace(/\/$/, "");
  const regions = [
    {name:"Edirne",lat:41.6771,lon:26.5557},{name:"Kırklareli",lat:41.7355,lon:27.2252},
    {name:"Tekirdağ",lat:40.9781,lon:27.5110},{name:"Çanakkale",lat:40.1553,lon:26.4142},
    {name:"İstanbul Avrupa",lat:41.15,lon:28.65}
  ];
  const copy = {
    tr:{scanning:"Bölgesel çevre verileri taranıyor…",done:"Tarama tamamlandı. Sonuçlar yalnızca alınabilen veri alanlarını içerir.",partial:"Tarama tamamlandı ancak bazı kaynaklar kullanılamıyor veya eksik.",failed:"Veri taraması başarısız. API adresini, CORS ayarlarını ve servis durumunu kontrol et.",loading:"Taranıyor…",weather:"Hava ve risk API",available:"Yanıt alındı",unavailable:"Erişilemedi",source:"Kaynak",scope:"Kapsam",missing:"Veri alanı eksik",risk:"Sağlayıcı risk göstergesi",temperature:"Maks. sıcaklık",humidity:"Min. bağıl nem",wind:"Maks. rüzgâr",rain:"Yağış",reasons:"Gerekçeler",noData:"Bu bölge için kullanılabilir ölçüm bulunamadı; skor üretilmedi.",hotspot:"NASA FIRMS yakın sıcak nokta",notIntegrated:"Uydu NDVI bu risk yanıtına entegre değil",noHotspotData:"FIRMS kaynağı yanıtında veri yok / kaynak erişilemiyor",low:"Düşük kural sinyali",moderate:"Orta kural sinyali",high:"Yüksek kural sinyali",critical:"Çok yüksek kural sinyali",weatherHot:"Yüksek sıcaklık kuruluk sinyalini artırır.",dry:"Düşük bağıl nem kuruluk sinyalini artırır.",windy:"Güçlü rüzgâr olası yayılım koşulunu artırabilir.",rainy:"Yağış yakın dönem kuruluk sinyalini azaltabilir.",missingWeather:"Gerekli hava alanları eksik; değerlendirme yapılmadı.",explain:"Skor bir olasılık değil, kural tabanlı önceliklendirme göstergesidir."},
    en:{scanning:"Scanning regional environmental data…",done:"Scan complete. Results include only data fields actually received.",partial:"Scan complete, but some sources are unavailable or incomplete.",failed:"Data scan failed. Check the API URL, CORS settings, and service health.",loading:"Scanning…",weather:"Weather and risk API",available:"Response received",unavailable:"Unavailable",source:"Source",scope:"Scope",missing:"Missing data field",risk:"Provider risk indicator",temperature:"Max temperature",humidity:"Min relative humidity",wind:"Max wind",rain:"Precipitation",reasons:"Reasons",noData:"No usable measurements for this region; no score was produced.",hotspot:"Nearby NASA FIRMS hotspot",notIntegrated:"Satellite NDVI is not integrated into this risk response",noHotspotData:"No FIRMS data in response / source unavailable",low:"Low rule signal",moderate:"Moderate rule signal",high:"High rule signal",critical:"Very high rule signal",weatherHot:"High temperature increases the dryness signal.",dry:"Low relative humidity increases the dryness signal.",windy:"Strong wind may increase potential spread conditions.",rainy:"Precipitation can reduce the recent dryness signal.",missingWeather:"Required weather fields are missing; no assessment was made.",explain:"The score is a rule-based prioritization indicator, not a probability."}
  };
  let language = (navigator.language || "tr").toLowerCase().startsWith("tr") ? "tr" : "en";
  const t = key => copy[language][key] || key;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const num = (v, suffix="") => Number.isFinite(Number(v)) && v !== null && v !== "" ? Number(v).toFixed(1)+suffix : "—";
  let map, markers = new Map(), latestResults = [];
  function setLanguage(next) { language = next; document.documentElement.lang = language; document.querySelectorAll("[data-i18n]").forEach(el => {const key=el.dataset.i18n; const value=copyUI[language][key]; if(value) el.textContent=value;}); renderResults(latestResults); }
  const copyUI = {
    tr:{brandSub:"Yerel çevresel zekâ / Local environmental intelligence",pilot:"TRAKYA · ARAŞTIRMA PİLOTU",navHome:"Ana Panel",navMap:"Risk Haritası",navAreas:"Alanlarım",navWeather:"Atmosfer",navSatellite:"Uydu Merkezi",navUav:"İHA / Yapay Zekâ",navAbout:"Sistem",heroTitle:"Veriyi tara. Bağlamı anla. Gerekçeli analiz üret.",heroBody:"Nexora Insight, erişilebilen çevresel API verilerini ve kaynak durumlarını tarar; ölçümleri, eksikleri ve kural tabanlı yorumları birbirinden ayırır. Bu ilk sürüm yerel çalışan, açıklanabilir bir analiz motorudur; eğitilmiş bir temel model veya resmî uyarı sistemi değildir.",scan:"Bölgesel verileri tara",clear:"Sonucu temizle",ready:"Hazır — analiz başlatmak için tara düğmesine bas.",regionsScanned:"Taranan bölgeler",dataCoverage:"Veri kapsamı",engineMode:"Motor modu",ruleBased:"Açıklanabilir kurallar",modelTitle:"Model ve eğitim durumu",modelIntro:"Sunucudaki model artefaktı, metaveri ve araştırma modelinin kapsamı API üzerinden doğrulanır.",refreshModel:"Model durumunu yenile",satelliteLink:"Uydu analizine git",mapLink:"Risk haritasına git",mapTitle:"Analiz haritası",focusRegion:"Odak bölge",mapHint:"Bir işaretçiye dokunarak o bölgeyi odakla. Harita taban haritası internet gerektirir.",mapNote:"Harita işaretçileri bölgesel analiz merkezleridir; saha yangın konumlarını göstermez.",evidenceTitle:"Kanıt ve kaynak dökümü",evidenceIntro:"Her sonuç, gerçekten alınan API yanıtı ve veri alanlarına göre üretilir.",noEvidence:"Henüz tarama yapılmadı.",analysisTitle:"Açıklanabilir bölgesel analiz",analysisIntro:"Motor sıcaklık, bağıl nem, rüzgâr, yağış ve varsa sağlayıcı risk sinyalini okur; gerekçeleri ayrı ayrı listeler. Veri eksikse eksik olarak kalır.",noAnalysis:"Veri taraması tamamlandığında analiz burada görünür.",disclaimer:"Bilimsel sınır: Bu sürüm deterministik, kural tabanlı ve açıklanabilirdir; öğrenilmiş bir model değildir. Skorlar kalibre edilmiş yangın olasılığı, doğrulanmış tahmin veya resmî uyarı sayılmaz. NASA FIRMS sıcak noktaları da tek başına doğrulanmış yangın değildir. Acil durumda yetkili kurumları izleyin."},
    en:{brandSub:"Local environmental intelligence / Yerel çevresel zekâ",pilot:"THRACE · RESEARCH PILOT",navHome:"Dashboard",navMap:"Risk Map",navAreas:"My Areas",navWeather:"Weather",navSatellite:"Satellite Hub",navUav:"UAV / AI",navAbout:"About",heroTitle:"Scan the data. Understand context. Produce explainable analysis.",heroBody:"Nexora Insight scans reachable environmental APIs and source status, distinguishing measurements, missing fields, and rule-based interpretations. This first release is a locally running explainable analysis engine—not a trained foundation model or an official alert service.",scan:"Scan regional data",clear:"Clear results",ready:"Ready — press scan to begin.",regionsScanned:"Regions scanned",dataCoverage:"Data coverage",engineMode:"Engine mode",ruleBased:"Explainable rules",modelTitle:"Model and training status",modelIntro:"Verify deployed model artifacts, metadata, and research scope through the API.",refreshModel:"Refresh model status",satelliteLink:"Open satellite analysis",mapLink:"Open risk map",mapTitle:"Analysis map",focusRegion:"Focus region",mapHint:"Tap a marker to focus that region. The basemap requires internet access.",mapNote:"Markers represent regional analysis centers, not field fire locations.",evidenceTitle:"Evidence and source ledger",evidenceIntro:"Every result is derived from API responses and fields actually received.",noEvidence:"No scan performed yet.",analysisTitle:"Explainable regional analysis",analysisIntro:"The engine reads temperature, relative humidity, wind, precipitation, and any available provider risk signal, then lists reasons separately. Missing data stays missing.",noAnalysis:"Analysis will appear here after the data scan.",disclaimer:"Scientific boundary: this release is deterministic, rule-based, and explainable; it is not a trained model. Scores are not calibrated fire probabilities, validated forecasts, or official alerts. NASA FIRMS hotspots alone are not confirmed fires. Follow authorities during emergencies."}
  };
  function initMap() {
    if (!window.L || !$("insightMap")) return;
    map = L.map("insightMap", {scrollWheelZoom:false}).setView([41.05,27.25],7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:17,attribution:"© OpenStreetMap contributors"}).addTo(map);
    regions.forEach(region => {
      const marker = L.circleMarker([region.lat,region.lon],{radius:7,color:"#0c3924",weight:2,fillColor:"#77efb0",fillOpacity:.9}).addTo(map);
      marker.bindTooltip(region.name);
      marker.on("click",()=>{$("regionSelect").value=region.name; focusRegion(region.name);});
      markers.set(region.name,marker);
    });
    setTimeout(()=>map.invalidateSize(),120);
  }
  function focusRegion(name) { const r=regions.find(x=>x.name===name); if(r&&map)map.flyTo([r.lat,r.lon],8,{duration:.45}); markers.forEach((m,k)=>m.setStyle({radius:k===name?10:7,fillColor:k===name?"#ffffff":"#77efb0"})); }
  async function getJson(path) {
    const response = await fetch(API_BASE+path,{headers:{Accept:"application/json"},cache:"no-store"});
    const payload = await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(payload.detail?.message || payload.detail || ("HTTP "+response.status));
    return payload;
  }
  function classify(score) { if(score>=75)return t("critical");if(score>=50)return t("high");if(score>=25)return t("moderate");return t("low"); }
  function analyze(row) {
    const weather=row?.weather||{}, analysis=row?.analysis||{};
    const vals={temperature:weather.temperature,humidity:weather.humidity,wind:weather.wind,precipitation:weather.precipitation};
    const missing=Object.entries(vals).filter(([,v])=>v===null||v===undefined||!Number.isFinite(Number(v))).map(([k])=>k);
    const reasons=[];
    if(missing.length) return {region:row.region,score:null,label:t("noData"),reasons:[t("missingWeather")+" "+missing.join(", ")],row};
    if(Number(vals.temperature)>=30)reasons.push(t("weatherHot"));
    if(Number(vals.humidity)<=40)reasons.push(t("dry"));
    if(Number(vals.wind)>=20)reasons.push(t("windy"));
    if(Number(vals.precipitation)>=5)reasons.push(t("rainy"));
    const score=Number(analysis.score ?? analysis.risk ?? analysis.risk_score);
    const scoreValid=Number.isFinite(score)&&score>=0&&score<=100;
    const finalScore=scoreValid?score:null;
    return {region:row.region,score:finalScore,label:scoreValid?classify(finalScore):t("noData"),reasons:reasons.length?reasons:[t("explain")],row};
  }
  function renderResults(results) {
    const evidence=$("evidenceList"), analyses=$("analysisResults");
    if(!results.length){evidence.innerHTML='<div class="nx-empty">'+esc(t("noEvidence"))+'</div>';analyses.innerHTML='<div class="nx-empty">'+esc(copyUI[language].noAnalysis)+'</div>';return;}
    evidence.innerHTML=results.map(r=>'<article class="nx-item"><b>'+esc(r.region)+' · '+esc(r.error?t("unavailable"):t("available"))+'</b><p>'+esc(t("source"))+': '+esc(r.data_source?.join(", ")||r.source||"Nexora API")+'</p><p>'+esc(t("scope"))+': '+esc(r.analysis_scope||r.data_quality?.nasa_firms_24h||"weather")+'</p><p>'+esc(r.error||("NASA FIRMS: "+(r.data_quality?.nasa_firms_24h||t("noHotspotData"))))+'</p></article>').join("");
    const items=results.map(analyze);
    analyses.innerHTML=items.map(item=>{const row=item.row||{},w=row.weather||{};const score=item.score===null?"—":Math.round(item.score)+"/100";const width=item.score===null?0:Math.max(0,Math.min(100,item.score));return '<article class="nx-item"><b>'+esc(item.region)+' · '+esc(item.label)+'</b><p>'+esc(t("temperature"))+': '+esc(num(w.temperature," °C"))+' · '+esc(t("humidity"))+': '+esc(num(w.humidity,"%"))+' · '+esc(t("wind"))+': '+esc(num(w.wind," km/h"))+' · '+esc(t("rain"))+': '+esc(num(w.precipitation," mm"))+'</p><p>'+esc(t("risk"))+': '+esc(score)+'</p><div class="nx-meter" aria-label="'+esc(item.label)+'"><span style="width:'+width+'%"></span></div><p><b>'+esc(t("reasons"))+'</b></p><p>'+item.reasons.map(esc).join(" ")+'</p><p>'+esc(t("notIntegrated"))+'</p></article>';}).join("");
    $("regionCount").textContent=results.length;
    const usable=results.filter(r=>!r.error && r.weather && ["temperature","humidity","wind","precipitation"].every(k=>r.weather[k]!==null&&r.weather[k]!==undefined)).length;
    $("coverage").textContent=results.length?Math.round(usable/results.length*100)+"%":"—";
  }
  async function scan() {
    const btn=$("scanBtn");btn.disabled=true;$("scanStatus").textContent=t("scanning");
    try {
      const payload=await getJson("/risk-analysis");
      const rows=Array.isArray(payload.results)?payload.results:Array.isArray(payload.regions)?payload.regions:Array.isArray(payload)?payload:[];
      if(!rows.length)throw new Error("API response did not include regional results");
      latestResults=rows.map(row=>({...row,region:row.region||row.name})).filter(row=>row.region);
      renderResults(latestResults);
      $("scanStatus").textContent=latestResults.some(r=>r.error||!r.weather) ? t("partial"):t("done");
      if($("regionSelect").value)focusRegion($("regionSelect").value);
    } catch(error) {
      latestResults=[];renderResults([]);
      $("scanStatus").textContent=t("failed")+" ("+String(error.message||error).slice(0,180)+")";
      $("evidenceList").innerHTML='<div class="nx-empty">'+esc(t("unavailable"))+': '+esc(error.message||error)+'</div>';
    } finally {btn.disabled=false;}
  }
  async function loadModelStatus() {
    const host = $("mlStatus");
    if (!host) return;
    host.textContent = language === "tr" ? "Model durumu sorgulanıyor…" : "Checking model status…";
    const endpoints = [
      {path: "/ml/status", label: language === "tr" ? "Trakya hotspot modeli" : "Thrace hotspot model"},
      {path: "/ml/research-status", label: language === "tr" ? "UCI araştırma modeli" : "UCI research model"}
    ];
    const results = await Promise.all(endpoints.map(async item => {
      try { return {...item, data: await getJson(item.path)}; }
      catch (error) { return {...item, error: String(error.message || error)}; }
    }));
    host.innerHTML = results.map(item => {
      const data = item.data || {};
      const ready = data.status === "ready";
      const status = item.error ? (language === "tr" ? "API erişilemiyor" : "API unavailable") :
        ready ? (language === "tr" ? "Artefakt hazır" : "Artifact ready") : (data.status || "unknown");
      const details = item.error || data.metadata?.model_version || data.message ||
        (language === "tr" ? "Eğitim artefaktı henüz hazır değil." : "Training artifact is not ready yet.");
      const warning = ready ? (item.path === "/ml/status" ?
        (language === "tr" ? "Hedef: FIRMS sıcak nokta vekili; doğrulanmış yangın değildir." : "Target: FIRMS hotspot proxy, not verified wildfire.") :
        (language === "tr" ? "UCI verisi Cezayir'e aittir; Trakya'da doğrulanmamıştır." : "UCI data is from Algeria; not validated in Thrace.")) : "";
      return '<article class="nx-item"><b>' + esc(item.label + " · " + status) + '</b><p>' +
        esc(details) + '</p><p>' + esc(warning) + '</p></article>';
    }).join("");
  }
  function clear() {latestResults=[];renderResults([]);$("regionCount").textContent="—";$("coverage").textContent="—";$("scanStatus").textContent=t("ready");}
  document.addEventListener("DOMContentLoaded",()=>{
    initMap();
    $("scanBtn")?.addEventListener("click",scan);
    $("clearBtn")?.addEventListener("click",clear);
    $("refreshModelBtn")?.addEventListener("click",loadModelStatus);
    loadModelStatus();
    $("languageBtn")?.addEventListener("click",()=>{setLanguage(language==="tr"?"en":"tr");loadModelStatus();});
    $("regionSelect")?.addEventListener("change",event=>focusRegion(event.target.value));
    setLanguage(language);
  });
})();