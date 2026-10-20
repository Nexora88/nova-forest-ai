/* NOVA Core: original, explainable environmental evidence synthesis. Not a trained ML model. */
(() => {
  "use strict";
  const $ = (s, root = document) => root.querySelector(s);
  const API = (window.NOVA_API_BASE || "https://nova-forest-ai-backend.vercel.app").replace(/\/$/, "");
  let language = "tr";
  let lastReport = null;
  const copy = {
    tr: { eyebrow:"NEXORA LABS / NOVA CORE",title:"Açıklanabilir çevresel zekâ",subtitle:"Mevcut kaynakları tarar, ölçümleri bir araya getirir ve her sonucu dayanağıyla açıklar.",refresh:"Verileri yeniden tara",scanning:"Kaynaklar taranıyor…",available:"Gözlem alındı",unavailable:"Erişilemiyor",noData:"Yeterli canlı veri alınamadı. Sistem eksik ölçümlerden sonuç üretmiyor.",signal:"Meteorolojik ön sinyal",evidence:"Kanıt kapsamı",sources:"Kaynak durumu",findings:"Analiz bulguları",next:"Önerilen kontrol",limitation:"Bilimsel sınır",sourceNote:"Bu çıktı, mevcut ölçümlere dayalı açıklanabilir bir kural motorudur; eğitilmiş bir model veya resmî yangın uyarısı değildir.",limitationText:"Meteorolojik sinyal yangını doğrulamaz. Uydu NDVI/NDMI yalnızca gerçek piksel sonuçları API tarafından döndürülürse kullanılır. Model durumu, model doğruluğu anlamına gelmez.",low:"Düşük ön sinyal",moderate:"Orta ön sinyal",high:"Yüksek ön sinyal",unknown:"Hesaplanamadı",factors:"Etkileyen ölçümler",temp:"Sıcaklık",humidity:"Bağıl nem",wind:"Rüzgâr",rain:"Yağış",adviceLow:"Güncel saha gözlemlerini ve yerel resmî duyuruları izlemeyi sürdür.",adviceModerate:"Saha koşullarını kontrol et; yerel resmî duyuruları ve yeni gözlemleri izle.",adviceHigh:"Yetkili kaynaklardaki güncel uyarıları kontrol et ve sahadan doğrulama iste. Bu sinyali tek başına acil durum kararı olarak kullanma.",evidenceGood:"Meteoroloji ölçümleri mevcut",evidencePartial:"Kısmi veri — belirsizlik yüksek",noObservation:"Gözlem yok; sıfır risk anlamına gelmez",weather:"Meteoroloji",satellite:"Uydu işleme",ml:"ML servis durumu",yolo:"Görüntü modeli",dataTimestamp:"Kaynak zaman damgası",noTimestamp:"Kaynak zaman damgası verilmedi",explain:"Nasıl yorumlanır?",engine:"NOVA Core v0.1 · Deterministik kanıt birleştirme"},
    en: { eyebrow:"NEXORA LABS / NOVA CORE",title:"Explainable environmental intelligence",subtitle:"Scans available sources, combines measurements, and explains every result with its evidence.",refresh:"Scan sources again",scanning:"Scanning sources…",available:"Observation received",unavailable:"Unavailable",noData:"Insufficient live data was received. The system does not infer results from missing measurements.",signal:"Meteorological preliminary signal",evidence:"Evidence coverage",sources:"Source status",findings:"Analysis findings",next:"Recommended check",limitation:"Scientific boundary",sourceNote:"This output is an explainable rule engine based on available measurements; it is not a trained model or an official wildfire warning.",limitationText:"A meteorological signal does not confirm a fire. Satellite NDVI/NDMI is used only when the API returns actual pixel-derived results. Model availability does not establish model accuracy.",low:"Low preliminary signal",moderate:"Moderate preliminary signal",high:"High preliminary signal",unknown:"Unable to calculate",factors:"Contributing measurements",temp:"Temperature",humidity:"Relative humidity",wind:"Wind",rain:"Precipitation",adviceLow:"Continue monitoring current field observations and local official notices.",adviceModerate:"Check field conditions and monitor local official notices and new observations.",adviceHigh:"Check current alerts from authorized sources and request field verification. Do not use this signal alone for emergency decisions.",evidenceGood:"Weather measurements available",evidencePartial:"Partial data — uncertainty is high",noObservation:"No observation; this does not mean zero risk",weather:"Weather",satellite:"Satellite processing",ml:"ML service status",yolo:"Vision model",dataTimestamp:"Source timestamp",noTimestamp:"No source timestamp provided",explain:"How to interpret this",engine:"NOVA Core v0.1 · Deterministic evidence synthesis"}
  };
  const t = key => copy[language][key] || key;
  const esc = value => String(value ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
  const valid = (o, keys) => !!o && keys.every(k => o[k] !== null && o[k] !== undefined && Number.isFinite(Number(o[k])));
  async function json(url) {
    const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("HTTP " + response.status);
    return response.json();
  }
  async function weatherFromBackend() {
    const body = await json(API + "/environment/region/Edirne");
    const c = body.data?.weather?.current || body.weather?.current || body.current;
    const w = { temperature:c?.temperature_2m ?? c?.temperature, humidity:c?.relative_humidity_2m ?? c?.humidity, wind:c?.wind_speed_10m ?? c?.wind, rain:c?.precipitation ?? c?.rain };
    if (!valid(w, ["temperature","humidity","wind","rain"])) throw new Error("weather fields missing");
    return { weather:w, timestamp:c?.time || body.updated_at || body.timestamp || null, source:body.source || "NexoraWildfire API · Open-Meteo" };
  }
  async function weatherFallback() {
    const u = new URL("https://api.open-meteo.com/v1/forecast");
    Object.entries({ latitude:"41.6771", longitude:"26.5557", current:"temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation", timezone:"Europe/Istanbul" }).forEach(([k,v]) => u.searchParams.set(k,v));
    const body = await json(u.toString());
    const c = body.current;
    const w = { temperature:c?.temperature_2m, humidity:c?.relative_humidity_2m, wind:c?.wind_speed_10m, rain:c?.precipitation };
    if (!valid(w, ["temperature","humidity","wind","rain"])) throw new Error("weather fields missing");
    return { weather:w, timestamp:c?.time || null, source:"Open-Meteo" };
  }
  async function optional(path) { try { return { ok:true, data:await json(API + path) }; } catch (error) { return { ok:false, error:String(error.message || error) }; } }
  function analyze(report) {
    const w = report.weather?.weather;
    if (!valid(w, ["temperature","humidity","wind","rain"])) return { score:null, band:"unknown", factors:[], advice:"noData", coverage:0 };
    const factors = [];
    let score = 0;
    const add = (name, points, detail) => { score += points; factors.push({ name, points, detail }); };
    // Transparent ordinal points for review prioritization only; not a calibrated probability.
    const temp = Number(w.temperature), humidity = Number(w.humidity), wind = Number(w.wind), rain = Number(w.rain);
    if (temp >= 35) add("temp",3,temp+"°C"); else if (temp >= 30) add("temp",2,temp+"°C"); else if (temp >= 25) add("temp",1,temp+"°C"); else add("temp",0,temp+"°C");
    if (humidity < 25) add("humidity",3,humidity+"%"); else if (humidity < 35) add("humidity",2,humidity+"%"); else if (humidity < 50) add("humidity",1,humidity+"%"); else add("humidity",0,humidity+"%");
    if (wind >= 35) add("wind",2,wind+" km/h"); else if (wind >= 20) add("wind",1,wind+" km/h"); else add("wind",0,wind+" km/h");
    if (rain >= 5) add("rain",-2,rain+" mm"); else if (rain > 0) add("rain",-1,rain+" mm"); else add("rain",0,rain+" mm");
    score = Math.max(0, score);
    return { score, band:score >= 6 ? "high" : score >= 3 ? "moderate" : "low", factors, coverage:4, advice:score >= 6 ? "adviceHigh" : score >= 3 ? "adviceModerate" : "adviceLow" };
  }
  function render(report) {
    lastReport = report;
    const root = $("#nova-core-ai");
    if (!root) return;
    const result = analyze(report);
    const sourceRows = [
      ["weather",!!report.weather?.weather,report.weather?.source || report.weather?.error || t("unavailable"),report.weather?.timestamp],
      ["satellite",!!report.satellite?.ok,report.satellite?.ok ? (report.satellite.data.source || report.satellite.data.status || "API reachable") : t("unavailable"),report.satellite?.data?.timestamp],
      ["ml",!!report.ml?.ok,report.ml?.ok ? (report.ml.data.status || report.ml.data.message || "API reachable") : t("unavailable"),report.ml?.data?.timestamp],
      ["yolo",!!report.yolo?.ok,report.yolo?.ok ? (report.yolo.data.status || report.yolo.data.message || "API reachable") : t("unavailable"),report.yolo?.data?.timestamp]
    ];
    root.innerHTML = '<div class="nova-core-head"><div><div class="eyebrow">'+t("eyebrow")+'</div><h2>'+t("title")+'</h2><p>'+t("subtitle")+'</p></div><div class="nova-core-controls"><div class="nova-lang" role="group" aria-label="Language"><button type="button" data-lang="tr" aria-pressed="'+(language==="tr")+'">TR</button><button type="button" data-lang="en" aria-pressed="'+(language==="en")+'">EN</button></div><button type="button" class="nova-refresh" data-refresh>'+t("refresh")+'</button></div></div>'+
    '<div class="nova-core-grid"><article class="nova-core-panel nova-core-primary"><div class="nova-panel-label">'+t("signal")+'</div><strong class="nova-score '+result.band+'">'+(result.score===null?"—":result.score+"/8")+'</strong><h3>'+t(result.band)+'</h3><p>'+t(result.advice)+'</p><small>'+t("engine")+'</small></article>'+
    '<article class="nova-core-panel"><div class="nova-panel-label">'+t("evidence")+'</div><strong class="nova-evidence">'+result.coverage+'/4</strong><p>'+(result.coverage===4?t("evidenceGood"):t("evidencePartial"))+'</p><small>'+esc(report.weather?.source || t("noObservation"))+'</small></article>'+
    '<article class="nova-core-panel"><div class="nova-panel-label">'+t("findings")+'</div><div class="nova-factors">'+(result.factors.length?result.factors.map(f=>'<div><span>'+t(f.name)+'</span><b>'+esc(f.detail)+'</b><small>'+(f.points>0?"+":"")+f.points+' '+(language==="tr"?"puan":"points")+'</small></div>').join(""):'<p>'+t("noData")+'</p>')+'</div></article></div>'+
    '<div class="nova-core-lower"><section class="nova-core-panel"><div class="nova-panel-label">'+t("sources")+'</div><div class="nova-source-list">'+sourceRows.map(([name,ok,detail,stamp])=>'<div class="nova-source-row"><span><i class="'+(ok?"is-ok":"is-off")+'"></i>'+t(name)+'</span><b>'+esc(detail)+'</b><small>'+(stamp?t("dataTimestamp")+": "+esc(stamp):t("noTimestamp"))+'</small></div>').join("")+'</div></section><section class="nova-core-panel"><div class="nova-panel-label">'+t("next")+'</div><p>'+t(result.advice)+'</p><details><summary>'+t("explain")+'</summary><p>'+t("sourceNote")+'</p><p>'+t("limitationText")+'</p></details></section></div><p class="nova-core-foot">'+t("sourceNote")+'</p>';
    root.querySelectorAll("[data-lang]").forEach(btn=>btn.addEventListener("click",()=>{language=btn.dataset.lang;render(lastReport||{});}));
    root.querySelector("[data-refresh]")?.addEventListener("click",load);
  }
  async function load() {
    const root = $("#nova-core-ai");
    if (!root) return;
    root.setAttribute("aria-busy","true");
    root.innerHTML = '<div class="nova-core-loading"><span class="nova-pulse"></span>'+t("scanning")+'</div>';
    let weather = null;
    try { weather = await weatherFromBackend(); } catch (_) {
      try { weather = await weatherFallback(); } catch (error) { weather = { error:String(error.message || error) }; }
    }
    const [satellite,ml,yolo] = await Promise.all([optional("/ndvi/status/Edirne"),optional("/ml/status"),optional("/ml/yolo/status")]);
    render({weather,satellite,ml,yolo});
    root.setAttribute("aria-busy","false");
  }
  window.NovaCore = { refresh:load, analyze };
  document.addEventListener("DOMContentLoaded",load);
})();