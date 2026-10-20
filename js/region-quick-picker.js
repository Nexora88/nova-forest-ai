/* Explicit province/district navigation for the environmental map. No geolocation guessing. */
(() => {
  const path = "../data/admin/tur_admin2.geojson";
  const host = document.querySelector(".map-toolbar");
  if (!host || document.getElementById("nova-region-quick-picker")) return;

  const panel = document.createElement("section");
  panel.id = "nova-region-quick-picker";
  panel.className = "nova-region-quick-picker";
  panel.setAttribute("aria-labelledby", "nova-region-quick-title");
  panel.innerHTML = `
    <div class="nova-region-quick-copy">
      <span class="eyebrow">BÖLGEYE GİT</span>
      <h3 id="nova-region-quick-title">İlini ve istersen ilçeni seç</h3>
      <p>Konum otomatik veya rastgele atanmaz. İl seçip devam edebilir, ilçeyi de seçerek haritayı doğrudan yakınlaştırabilirsin.</p>
    </div>
    <form class="nova-region-quick-form">
      <label>İl
        <select name="province" required><option value="">İl seç…</option></select>
      </label>
      <label>İlçe <span>(isteğe bağlı)</span>
        <select name="district" disabled><option value="">Önce il seç…</option></select>
      </label>
      <button type="submit">Haritada göster →</button>
    </form>
    <p class="nova-region-quick-status" role="status" aria-live="polite">İl ve ilçe listesi yükleniyor…</p>`;
  host.insertAdjacentElement("afterend", panel);

  const form = panel.querySelector("form");
  const province = form.elements.province;
  const district = form.elements.district;
  const status = panel.querySelector(".nova-region-quick-status");
  let features = [];

  const clean = value => String(value || "").trim();
  const provinceOf = feature => clean(feature.properties?.adm1_name1 || feature.properties?.adm1_name);
  const districtOf = feature => clean(feature.properties?.adm2_name1);

  function fillDistricts(name) {
    district.replaceChildren(new Option(name ? "İlçe seç (isteğe bağlı)…" : "Önce il seç…", ""));
    district.disabled = !name;
    const names = [...new Set(features.filter(f => provinceOf(f) === name).map(districtOf).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "tr"));
    names.forEach(name => district.add(new Option(name, name)));
    status.textContent = name ? names.length + " ilçe bulundu. İl tek başına da seçilebilir." : "Önce bir il seç.";
  }

  province.addEventListener("change", () => fillDistricts(province.value));
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const selectedProvince = province.value;
    const selectedDistrict = district.value;
    if (!selectedProvince) {
      status.textContent = "Devam etmek için listeden bir il seç.";
      province.focus();
      return;
    }
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    status.textContent = "Seçilen bölge haritada açılıyor…";
    try {
      if (!window.NexoraMap?.openProvince) throw new Error("Harita katmanı henüz hazır değil.");
      await window.NexoraMap.openProvince(selectedProvince);
      if (selectedDistrict) {
        const found = await window.NexoraMap.selectDistrict(selectedDistrict);
        if (!found) throw new Error("Bu ilçe seçilen il altında bulunamadı.");
      }
      status.textContent = selectedDistrict
        ? selectedProvince + " → " + selectedDistrict + " haritada açıldı."
        : selectedProvince + " haritada açıldı. İstersen haritadan bir ilçe seçebilirsin.";
    } catch (error) {
      status.textContent = error?.message || "Bölge açılamadı. Bağlantını kontrol edip tekrar dene.";
    } finally {
      button.disabled = false;
    }
  });

  fetch(path, { cache: "force-cache" })
    .then(response => { if (!response.ok) throw new Error("district_data_unavailable"); return response.json(); })
    .then(data => {
      features = Array.isArray(data.features) ? data.features.filter(f => provinceOf(f) && districtOf(f)) : [];
      const names = [...new Set(features.map(provinceOf))].sort((a, b) => a.localeCompare(b, "tr"));
      if (!names.length) throw new Error("district_data_empty");
      names.forEach(name => province.add(new Option(name, name)));
      status.textContent = names.length + " il hazır. İlçe seçmek isteğe bağlıdır.";
      const saved = (() => { try { return JSON.parse(localStorage.getItem("nexorawildfire-profile-v1") || "null"); } catch { return null; } })();
      if (saved?.province && names.includes(saved.province)) {
        province.value = saved.province;
        fillDistricts(saved.province);
        if (saved.district) district.value = saved.district;
      }
    })
    .catch(() => { status.textContent = "Yerel ilçe listesi yüklenemedi. Haritadan il seçmeyi deneyebilirsin; konum uydurulmaz."; });
})();
