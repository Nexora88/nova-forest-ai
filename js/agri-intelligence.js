(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const api = (window.NOVA_API_BASE || "https://nova-forest-ai-backend.vercel.app").replace(/\/$/, "");

  function scoreFarm(weather) {
    const t = Number(weather.temperature);
    const h = Number(weather.humidity);
    const wind = Number(weather.wind);
    const rain = Number(weather.rain);
    // An indicative rule-based comfort signal, not a trained crop-yield model.
    return Math.max(0, Math.min(100, Math.round(
      100 - Math.abs(t - 23) * 2.2 - Math.max(0, 35 - h) * 1.1 -
      Math.max(0, wind - 20) * 0.7 + Math.min(rain, 12) * 1.5
    )));
  }

  function classify(score) {
    return score >= 80 ? "Uygun koşul sinyali" :
      score >= 60 ? "İzlenmeli" :
      score >= 40 ? "Olumsuzlaşan koşul" : "Olumsuz koşul sinyali";
  }

  function validWeather(weather) {
    return weather && ["temperature", "humidity", "wind", "rain"]
      .every(key => weather[key] !== null && weather[key] !== undefined && Number.isFinite(Number(weather[key])));
  }

  function render(data) {
    const box = $("#agri-intelligence");
    if (!box || !validWeather(data?.weather)) return false;
    const weather = data.weather;
    const score = scoreFarm(weather);
    const source = data.source || "NexoraWildfire backend";
    box.innerHTML =
      '<div class="agri-head"><div><div class="eyebrow">NEXORA / AGRI INTELLIGENCE</div>' +
      '<h2>Tarım Koşulları</h2><p>Sıcaklık, nem, rüzgâr ve yağıştan türetilen açıklanabilir ön gösterge.</p></div>' +
      '<b>' + score + '/100</b></div>' +
      '<div class="agri-grid">' +
      [['Sulama','Toprak nemi ve ET₀ için ayrı ölçüm gerekir'],['Ekim / hasat','Sıcaklık + yağış penceresi'],['Bitki stresi','VPD ve bitki verisi ayrıca gerekir'],['Arıcılık','Uçuş koşulları; arılık konumu gerekir'],['Hayvancılık','Sıcaklık + nem sinyali'],['Ekosistem','Yerel saha gözlemiyle birlikte yorumlanmalı']]
        .map(item => '<article><span>' + item[0] + '</span><strong>' + classify(score) + '</strong><small>' + item[1] + '</small></article>')
        .join('') +
      '</div><p class="agri-data-note">Kaynak: ' + source + '. Bu puan basit kural tabanlı bir ön göstergedir; eğitilmiş/validasyonu yapılmış tarımsal yapay zekâ modeli değildir. Eksik toprak veya uydu verisi tahmin edilmez.</p>';
    return true;
  }

  async function backendWeather() {
    const response = await fetch(api + "/environment/region/Edirne", { cache: "no-store" });
    if (!response.ok) throw new Error("backend_http_" + response.status);
    const body = await response.json();
    const current = body.data?.weather?.current;
    const weather = {
      temperature: current?.temperature_2m,
      humidity: current?.relative_humidity_2m,
      wind: current?.wind_speed_10m,
      rain: current?.precipitation
    };
    if (!validWeather(weather)) throw new Error("backend_weather_missing");
    return { weather, source: "NexoraWildfire API · Edirne" };
  }

  async function publicWeatherFallback() {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", "41.6771");
    url.searchParams.set("longitude", "26.5557");
    url.searchParams.set("current", "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation");
    url.searchParams.set("timezone", "Europe/Istanbul");
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("open_meteo_http_" + response.status);
    const body = await response.json();
    const current = body.current;
    const weather = {
      temperature: current?.temperature_2m,
      humidity: current?.relative_humidity_2m,
      wind: current?.wind_speed_10m,
      rain: current?.precipitation
    };
    if (!validWeather(weather)) throw new Error("open_meteo_weather_missing");
    return { weather, source: "Open-Meteo · canlı meteoroloji yedeği" };
  }

  async function init() {
    const box = $("#agri-intelligence");
    if (!box) return;
    try {
      const data = await backendWeather();
      render(data);
      return;
    } catch (error) {
      console.warn("NexoraWildfire backend weather unavailable; trying public weather source.", error);
    }
    try {
      render(await publicWeatherFallback());
    } catch (error) {
      console.warn("NexoraWildfire agricultural panel unavailable.", error);
      box.innerHTML = '<div class="agri-head"><div><div class="eyebrow">NEXORA / AGRI INTELLIGENCE</div><h2>Tarım Koşulları</h2><p>Canlı meteoroloji verisi alınamadı. Bu panel veri gelene kadar puan üretmiyor.</p></div><b>VERİ YOK</b></div><p class="agri-data-note">Bağlantı, CORS ve kaynak durumu kontrol edilmeli. Eksik veriler örnek değerlerle doldurulmaz.</p>';
    }
  }

  window.NovaAgri = { render, refresh: init };
  document.addEventListener("DOMContentLoaded", init);
})();