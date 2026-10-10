/* NexoraWildfire enterprise asset-risk PDF workflow. */
(function () {
  const form = document.querySelector("[data-enterprise-report-form]");
  const API_BASE = (window.NOVA_API_BASE || (location.hostname.endsWith("github.io") ? "https://nova-forest-ai-backend.vercel.app" : "/api")).replace(/\/$/, "");
  if (!form) return;
  const status = form.querySelector("[data-report-status]");
  const submit = form.querySelector('button[type="submit"]');
  const setStatus = (message, error = false) => {
    status.textContent = message;
    status.style.color = error ? "#ff9c9c" : "#9bc9aa";
  };
  async function waitForJob(jobId, token) {
    for (let attempt = 0; attempt < 90; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2500));
      const response = await fetch(API_BASE + "/enterprise/reports/" + encodeURIComponent(jobId), {headers:{Authorization:"Bearer " + token}});
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail?.message || body.detail || "Rapor durumu alınamadı.");
      if (body.status === "finished") return body.result;
      if (body.status === "failed") throw new Error("PDF oluşturulamadı. Worker günlüklerini kontrol edin.");
      setStatus("Analiz kuyruğa alındı… " + (attempt + 1) + "/90");
    }
    throw new Error("İşlem zaman aşımına uğradı. Daha sonra tekrar deneyin.");
  }
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const session = window.NovaAuth?.session?.();
    if (!session?.access_token) { setStatus("Kurumsal rapor için giriş yapmalısınız.", true); return; }
    const file = form.querySelector('input[type="file"]').files?.[0];
    if (file && file.size > 1000000) { setStatus("GeoJSON dosyası 1 MB sınırını aşamaz.", true); return; }
    if (!file && !window.NexoraEnterpriseDraw?.geojson) { setStatus("Haritada varlık çiz veya GeoJSON dosyası yükle.", true); return; }
    submit.disabled = true;
    try {
      setStatus("GeoJSON doğrulanıyor…");
      const geojson = file ? JSON.parse(await file.text()) : window.NexoraEnterpriseDraw.geojson;
      const payload = {company_name:form.elements.company_name.value.trim(),asset_name:form.elements.asset_name.value.trim(),asset_type:form.elements.asset_type.value,buffer_m:Number(form.elements.buffer_m.value),asset_geojson:geojson};
      const response = await fetch(API_BASE + "/enterprise/reports", {method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer " + session.access_token},body:JSON.stringify(payload)});
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail?.message || body.detail || "Kurumsal rapor erişimi veya görev başlatma başarısız.");
      setStatus("Uydu, meteoroloji ve erişim kaynakları sorgulanıyor…");
      const result = await waitForJob(body.job_id, session.access_token);
      if (!result?.artifact_url) throw new Error("PDF bağlantısı dönmedi.");
      const previous = form.querySelector("[data-report-download]"); previous?.remove();
      const link = document.createElement("a");
      link.href = result.artifact_url; link.target = "_blank"; link.rel = "noopener"; link.textContent = "PDF raporunu aç / indir";
      link.style.cssText = "display:inline-block;margin-top:10px;color:#00ff66;font-weight:700";
      link.dataset.reportDownload = "true"; status.after(link);
      const ds = result.data_status || {};
      setStatus("PDF hazır. Sentinel-2: " + (ds.sentinel2 || "bilinmiyor") + " · FIRMS 10 gün: " + (ds.firms_10d || "bilinmiyor") + " · FIRMS 5 yıl: " + (ds.firms_5y || "unavailable") + " · 3 aylık tahmin: " + (ds.weather_3m || "unavailable") + ". Bağlantı 15 dakika geçerli.");
    } catch (error) { const message = error instanceof TypeError && /fetch/i.test(error.message) ? "Sunucuya ulaşılamadı (Failed to fetch). Backend dağıtımı, CORS izni veya ağ bağlantısı kontrol edilmeli; rapor gönderilmedi." : (error.message || "Rapor hazırlanamadı."); setStatus(message, true); }
    finally { submit.disabled = false; }
  });
})();
