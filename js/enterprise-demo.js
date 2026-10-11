/* Enterprise demo/quote form. It never claims to submit unless a contact email is configured. */
(() => {
  const form = document.querySelector("[data-enterprise-demo-form]");
  if (!form) return;
  const status = form.querySelector("[data-demo-status]");
  const panel = form.querySelector("[data-demo-draft-panel]");
  const draft = form.querySelector("[data-demo-draft]");
  const copyButton = form.querySelector("[data-demo-copy]");
  const configuredEmail = (document.querySelector('meta[name="nexora-enterprise-contact-email"]')?.content || "").trim();
  const safeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configuredEmail) ? configuredEmail : "";
  const buildDraft = data => [
    "NexoraWildfire AI — Kurumsal Demo / Teklif Talebi",
    "",
    "İletişim kişisi: " + data.get("contact_name"),
    "Şirket / kurum: " + data.get("company"),
    "İş e-postası: " + data.get("email"),
    "İlgi alanı: " + data.get("interest"),
    "",
    "İhtiyaç / mesaj:",
    data.get("message") || "(Belirtilmedi)",
    "",
    "Not: Bu talep bir satın alma veya abonelik başlatmaz."
  ].join("\n");
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const message = buildDraft(new FormData(form));
    if (safeEmail) {
      const subject = encodeURIComponent("NexoraWildfire AI — Kurumsal demo / teklif talebi");
      window.location.href = "mailto:" + safeEmail + "?subject=" + subject + "&body=" + encodeURIComponent(message);
      status.textContent = "E-posta uygulaman açılıyorsa talep taslağı hazır. Gönderimi e-posta uygulamanda onaylamalısın.";
      panel.hidden = true;
      return;
    }
    draft.value = message;
    panel.hidden = false;
    status.textContent = "İletişim e-postası henüz yapılandırılmadığı için talep gönderilmedi. Taslağı kopyalayabilir; adres tanımlandığında form e-posta uygulamasını açacaktır.";
    panel.scrollIntoView({behavior: "smooth", block: "nearest"});
  });
  copyButton?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(draft.value);
      status.textContent = "Talep taslağı panoya kopyalandı; gönderilmedi.";
    } catch {
      draft.focus();
      draft.select();
      status.textContent = "Otomatik kopyalama kullanılamıyor. Metni seçip cihazının Kopyala komutunu kullan.";
    }
  });
})();
