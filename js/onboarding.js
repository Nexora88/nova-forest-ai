const PROFILE_KEY = "nexorawildfire-profile-v1";
const HOME_KEY = "nexorawildfire-home-v1";
const DISTRICT_DATA_URL = "data/admin/tur_admin2.geojson";
let onboardingDistrictFeatures = [];

function novaEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function novaProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null"); }
  catch { return null; }
}

function novaOnboard() {
  const existingProfile = novaProfile();
  const triggerHost = document.querySelector(".hero .hero-actions") || document.querySelector(".hero");
  if (triggerHost && !document.getElementById("nova-region-trigger")) {
    const trigger = document.createElement("button");
    trigger.id = "nova-region-trigger";
    trigger.type = "button";
    trigger.className = "nova-region-trigger";
    trigger.textContent = existingProfile?.district
      ? "📍 Bölge: " + existingProfile.district + " · Değiştir"
      : "📍 İl / ilçe seç";
    trigger.addEventListener("click", () => showRegionPicker(true));
    triggerHost.appendChild(trigger);
  }
  if (!existingProfile?.completed) showRegionPicker(false);
}

async function loadDistrictData() {
  if (onboardingDistrictFeatures.length) return onboardingDistrictFeatures;
  const response = await fetch(DISTRICT_DATA_URL, { cache: "force-cache" });
  if (!response.ok) throw new Error("district_data_unavailable");
  const data = await response.json();
  onboardingDistrictFeatures = Array.isArray(data.features) ? data.features.filter(feature => {
    const p = feature?.properties || {};
    return (p.adm1_name1 || p.adm1_name) && p.adm2_name1 &&
      Number.isFinite(Number(p.center_lat)) && Number.isFinite(Number(p.center_lon));
  }) : [];
  if (!onboardingDistrictFeatures.length) throw new Error("district_data_empty");
  return onboardingDistrictFeatures;
}

function showRegionPicker(isEditing) {
  document.querySelector(".nova-onboarding")?.remove();
  const wrap = document.createElement("div");
  wrap.className = "nova-onboarding";
  wrap.innerHTML = '<section class="nova-onboard-card" role="dialog" aria-modal="true" aria-labelledby="nova-onboard-title">' +
    '<div class="eyebrow">NEXORAWILDFIRE / BÖLGE SEÇİMİ</div>' +
    '<h2 id="nova-onboard-title">' + (isEditing ? "Bölgeni güncelle" : "Başlangıç bölgeni seç") + '</h2>' +
    '<p>İl ve ilçeyi kendin seç. Sistem rastgele konum atamaz; seçtiğin ilçenin yerel idari veri setindeki merkez koordinatları kullanılır.</p>' +
    '<form id="nova-region-form">' +
    '<label for="nova-province">İl</label><select id="nova-province" name="province" required><option value="">İl seç…</option></select>' +
    '<label for="nova-district">İlçe</label><select id="nova-district" name="district" required disabled><option value="">Önce il seç…</option></select>' +
    '<label for="nova-place-detail">Mahalle / köy (isteğe bağlı)</label><input id="nova-place-detail" name="locality" maxlength="100" placeholder="Örn. Yaylaköy (isteğe bağlı)">' +
    '<label for="nova-region-type">Kullanım amacı</label><select id="nova-region-type" name="type"><option value="genel">Genel kullanım</option><option value="çiftçi">Tarım / çiftçilik</option><option value="arıcı">Arıcılık</option><option value="orman">Orman / doğa</option></select>' +
    '<label class="nova-region-save"><input type="checkbox" name="save" checked> Başlangıç konumunu kaydet</label>' +
    '<p class="nova-region-status" role="status" aria-live="polite">İlçe listesi yükleniyor…</p>' +
    '<div class="nova-onboard-actions"><button type="button" data-skip>Konum seçmeden devam et</button><button type="submit" data-submit disabled>Seçimi kaydet →</button></div>' +
    '</form></section>';
  document.body.appendChild(wrap);

  const form = wrap.querySelector("#nova-region-form");
  const provinceSelect = form.elements.province;
  const districtSelect = form.elements.district;
  const status = wrap.querySelector(".nova-region-status");
  const submit = form.querySelector("[data-submit]");
  const prior = novaProfile() || {};
  const priorType = ["genel", "çiftçi", "arıcı", "orman"].includes(prior.type) ? prior.type : "genel";
  form.elements.type.value = priorType;
  form.elements.locality.value = prior.locality || "";

  loadDistrictData().then(features => {
    const provinceNames = [...new Set(features.map(feature => {
      const p = feature.properties || {};
      return String(p.adm1_name1 || p.adm1_name).trim();
    }).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr"));
    provinceNames.forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      provinceSelect.appendChild(option);
    });
    status.textContent = provinceNames.length + " il ve gerçek ilçe kayıtları yüklendi.";
    submit.disabled = false;
    if (prior.province && provinceNames.includes(prior.province)) {
      provinceSelect.value = prior.province;
      fillDistricts(prior.province, prior.district || "");
    }
  }).catch(() => {
    status.textContent = "İlçe verisi yüklenemedi. Konum seçmeden devam edebilirsin; sistem konum uydurmaz.";
  });

  function fillDistricts(province, selectedDistrict) {
    districtSelect.replaceChildren(new Option("İlçe seç…", ""));
    districtSelect.disabled = !province;
    if (!province) return;
    const names = [...new Set(onboardingDistrictFeatures.filter(feature => {
      const p = feature.properties || {};
      return String(p.adm1_name1 || p.adm1_name).trim() === province;
    }).map(feature => String(feature.properties.adm2_name1).trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "tr"));
    names.forEach(name => districtSelect.add(new Option(name, name)));
    if (selectedDistrict && names.includes(selectedDistrict)) districtSelect.value = selectedDistrict;
    status.textContent = names.length + " ilçe bulundu. Devam etmek için bir ilçe seç.";
  }

  provinceSelect.addEventListener("change", () => fillDistricts(provinceSelect.value, ""));
  districtSelect.addEventListener("change", () => {
    status.textContent = districtSelect.value
      ? provinceSelect.value + " / " + districtSelect.value + " seçildi."
      : "Devam etmek için bir ilçe seç.";
  });

  wrap.querySelector("[data-skip]").addEventListener("click", () => {
    if (!isEditing || !prior.completed) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ completed: true, locationSkipped: true }));
    }
    wrap.remove();
    const trigger = document.getElementById("nova-region-trigger");
    if (trigger) {
      const current = novaProfile();
      trigger.textContent = current?.district
        ? "📍 Bölge: " + current.district + " · Değiştir"
        : "📍 İl / ilçe seç";
    }
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    const province = provinceSelect.value;
    const district = districtSelect.value;
    if (!province || !district) {
      status.textContent = "Rastgele konum atanmaz. Lütfen il ve ilçe seç veya konum seçmeden devam et.";
      return;
    }
    const feature = onboardingDistrictFeatures.find(item => {
      const p = item.properties || {};
      return String(p.adm1_name1 || p.adm1_name).trim() === province &&
        String(p.adm2_name1).trim() === district;
    });
    if (!feature) {
      status.textContent = "Seçilen ilçe için doğrulanabilir koordinat bulunamadı. Başka bir ilçe seç.";
      return;
    }
    const p = feature.properties || {};
    const lat = Number(p.center_lat);
    const lon = Number(p.center_lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      status.textContent = "Bu ilçe için geçerli merkez koordinatı yok. Konum kaydedilmedi.";
      return;
    }
    const locality = form.elements.locality.value.trim();
    const type = form.elements.type.value;
    const displayName = [locality, district, province, "Türkiye"].filter(Boolean).join(", ");
    const profile = { completed: true, locationSkipped: false, province, district, locality, place: displayName, displayName, type, lat, lon };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    if (form.elements.save.checked) {
      localStorage.setItem(HOME_KEY, JSON.stringify({ name: locality || district, displayName, province, district, locality, type, lat, lon }));
    } else {
      localStorage.removeItem(HOME_KEY);
    }
    wrap.remove();
    const trigger = document.getElementById("nova-region-trigger");
    if (trigger) trigger.textContent = "📍 Bölge: " + district + " · Değiştir";
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", novaOnboard);
} else {
  novaOnboard();
}
window.NovaOnboarding = { open: () => showRegionPicker(true) };
