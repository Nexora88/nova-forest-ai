/* Satellite area analysis: real Copernicus time-series API + honest ML readiness. */
(() => {
  const root = document.querySelector("[data-satellite-lab]");
  if (!root || !window.L) return;
  const apiBase = (window.NOVA_API_BASE || (location.hostname.endsWith("github.io") ? "https://nova-forest-ai.vercel.app/api" : "/api")).replace(/\/$/, "");
  const statusEl = root.querySelector("[data-area-status]");
  const resultEl = root.querySelector("[data-area-results]");
  const aiEl = root.querySelector("[data-ai-readiness]");
  const map = L.map(root.querySelector("[data-area-map]"), { scrollWheelZoom: false }).setView([41.15, 27.1], 8);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18, attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  const points = [];
  let line = null;
  let polygon = null;
  const markerLayer = L.layerGroup().addTo(map);
  const tr = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  function status(message) { statusEl.textContent = message; }
  function redraw() {
    markerLayer.clearLayers();
    points.forEach((p, i) => L.circleMarker(p, { radius: 5, color: "#00ff77", fillOpacity: .9 }).bindTooltip("Nokta " + (i + 1)).addTo(markerLayer));
    if (line) map.removeLayer(line);
    if (polygon) map.removeLayer(polygon);
    line = points.length > 1 ? L.polyline(points, { color: "#00ff77", weight: 2, dashArray: "6 5" }).addTo(map) : null;
    polygon = points.length > 2 ? L.polygon(points, { color: "#00ff77", fillColor: "#00ff77", fillOpacity: .12, weight: 2 }).addTo(map) : null;
    root.querySelector("[data-point-count]").textContent = points.length + " nokta";
  }
  map.on("click", e => {
    if (points.length >= 80) { status("En fazla 80 köşe noktası eklenebilir."); return; }
    points.push([e.latlng.lat, e.latlng.lng]);
    redraw();
    status(points.length < 3 ? "Poligon için en az 3 nokta seç." : "Alan hazır. Sentinel-2 zaman serisini hesaplatabilirsin.");
  });
  root.querySelector("[data-clear-area]").addEventListener("click", () => {
    points.splice(0, points.length); redraw(); resultEl.replaceChildren();
    status("Alan temizlendi. Haritaya tıklayarak yeni alan çiz.");
  });
  function addMetric(label, value) {
    const div = document.createElement("div"); div.className = "sat-metric";
    const name = document.createElement("span"); name.textContent = label;
    const val = document.createElement("strong"); val.textContent = value;
    div.append(name, val); resultEl.append(div);
  }
  function drawSeries(series) {
    const valid = series.filter(x => Number.isFinite(Number(x.ndvi)));
    if (!valid.length) return;
    const w = 640, h = 210, pad = 30;
    const coords = valid.map((x, i) => {
      const px = pad + (valid.length === 1 ? 0 : i * (w - 2 * pad) / (valid.length - 1));
      const py = h - pad - (Math.max(-1, Math.min(1, Number(x.ndvi)) + 1) / 2) * (h - 2 * pad);
      return [px, py, x];
    });
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Sentinel-2 NDVI zaman serisi");
    const axis = document.createElementNS(svg.namespaceURI, "path");
    axis.setAttribute("d", `M${pad} ${pad} V${h-pad} H${w-pad}`); axis.setAttribute("fill", "none"); axis.setAttribute("stroke", "#547463"); svg.append(axis);
    [-1,0,1].forEach(v => {
      const y = h-pad-((v+1)/2)*(h-2*pad);
      const label = document.createElementNS(svg.namespaceURI,"text"); label.setAttribute("x","4"); label.setAttribute("y",String(y+4)); label.setAttribute("fill","#a7c7b2"); label.setAttribute("font-size","12"); label.textContent=String(v); svg.append(label);
    });
    const path = document.createElementNS(svg.namespaceURI, "path");
    path.setAttribute("d", coords.map((p,i)=>(i?"L":"M")+p[0]+","+p[1]).join(" "));
    path.setAttribute("fill","none"); path.setAttribute("stroke","#00ff77"); path.setAttribute("stroke-width","3"); svg.append(path);
    coords.forEach(([x,y,item]) => {
      const c = document.createElementNS(svg.namespaceURI,"circle"); c.setAttribute("cx",String(x));c.setAttribute("cy",String(y));c.setAttribute("r","4");c.setAttribute("fill","#00ff77");
      const title = document.createElementNS(svg.namespaceURI,"title");title.textContent=(item.from||"Tarih yok")+" · NDVI "+item.ndvi; c.append(title);svg.append(c);
    });
    const wrap=document.createElement("div");wrap.className="sat-chart";wrap.append(svg);
    const caption=document.createElement("p");caption.className="sat-muted";caption.textContent="NDVI: B08 (yakın kızılötesi) ve B04 (kırmızı) yansımalarından hesaplanan indeks. Grafik yalnızca API'nin döndürdüğü gerçek örnekleri gösterir.";wrap.append(caption);resultEl.append(wrap);
  }
  root.querySelector("[data-run-analysis]").addEventListener("click", async () => {
    if (points.length < 3) { status("Analiz için en az 3 noktalı bir alan çiz."); return; }
    const ring = points.map(([lat, lon]) => [lon, lat]);
    ring.push([...ring[0]]);
    const days = Number(root.querySelector("[data-days]").value);
    const interval = root.querySelector("[data-interval]").value;
    status("Copernicus Sentinel-2 zaman serisi sorgulanıyor…");
    resultEl.replaceChildren();
    root.querySelector("[data-run-analysis]").disabled = true;
    try {
      const response = await fetch(apiBase + "/ndvi/area-timeseries", {
        method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ geometry: { type: "Polygon", coordinates: [ring] }, days, interval })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : data.detail?.message || "API isteği başarısız (" + response.status + ")");
      if (data.status !== "available") {
        status(data.status === "not_configured" ? "Copernicus işleme kimlik bilgileri yapılandırılmamış." : (data.message || "Uydu analizi şu an kullanılamıyor."));
        addMetric("Durum", data.status || "veri yok");
        addMetric("Kaynak", data.source || "Copernicus Sentinel-2 L2A");
        if (data.message) addMetric("Açıklama", data.message);
        return;
      }
      const latest = data.latest;
      status("Analiz tamamlandı · " + (data.series || []).length + " zaman aralığı");
      addMetric("Kaynak", data.source || "Copernicus Sentinel-2 L2A");
      addMetric("Son NDVI", latest?.ndvi == null ? "Veri yok" : Number(latest.ndvi).toFixed(3));
      addMetric("Bitki örtüsü göstergesi", latest?.classification || "Sınıflandırılamadı");
      addMetric("Son NDMI", latest?.ndmi == null ? "Veri yok" : Number(latest.ndmi).toFixed(3));
      addMetric("NDVI değişimi", data.delta?.ndvi == null ? "Karşılaştırma için yeterli veri yok" : (data.delta.ndvi > 0 ? "+" : "") + Number(data.delta.ndvi).toFixed(3));
      drawSeries(data.series || []);
      const note = document.createElement("p"); note.className = "sat-muted"; note.textContent = data.method || "Sentinel-2 istatistik API'si";
      resultEl.append(note);
    } catch (error) {
      status("Analiz başarısız: " + (error?.message || "bağlantı hatası"));
    } finally { root.querySelector("[data-run-analysis]").disabled = false; }
  });
  async function checkAi() {
    aiEl.textContent = "Model ve servis durumu kontrol ediliyor…";
    const checks = [
      { label: "Eğitilmiş hava/termal anomali modeli", path: "/ml/status" },
      { label: "Görüntü yangın/duman çıkarımı", path: "/ml/yolo/status" }
    ];
    const rows = await Promise.all(checks.map(async item => {
      try {
        const r = await fetch(apiBase + item.path, { headers: { "Accept": "application/json" } });
        const data = await r.json();
        return { label: item.label, status: data.status || (r.ok ? "durum bilinmiyor" : "erişilemiyor"), message: data.message || data.detail?.message || "", ok: r.ok };
      } catch { return { label: item.label, status: "bağlantı yok", message: "Backend'e erişilemiyor.", ok: false }; }
    }));
    aiEl.replaceChildren();
    rows.forEach(row => {
      const card = document.createElement("div"); card.className = "sat-ai-status";
      const title = document.createElement("strong"); title.textContent = row.label;
      const badge = document.createElement("span"); badge.textContent = row.status.replaceAll("_", " ");
      badge.className = "sat-ai-badge" + (["ready","available"].includes(row.status) ? " is-ready" : "");
      const message = document.createElement("p"); message.textContent = row.message || (row.ok ? "Servis yanıt verdi; bu, model doğruluğunun kanıtı değildir." : "Bu model şu anda kullanılamıyor.");
      card.append(title, badge, message); aiEl.append(card);
    });
    const note = document.createElement("p"); note.className = "sat-muted"; note.textContent = "Modelin hazır olması tek başına bilimsel doğrulama anlamına gelmez. Trakya'da etiketli verilerle bağımsız değerlendirme yapılmadan çıktı resmî yangın tespiti veya tahmini değildir.";
    aiEl.append(note);
  }
  redraw(); checkAi();
})();