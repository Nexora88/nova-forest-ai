const NOVA_ALERT_SETTINGS_KEY = "nova-forest-alert-settings-v2";
const NOVA_ALERTS_KEY = "nova-forest-alerts-v1";

function getNovaAlertSettings() {
  return JSON.parse(localStorage.getItem(NOVA_ALERT_SETTINGS_KEY) || '{"enabled":true,"threshold":70}');
}

function saveNovaAlert(alert) {
  const alerts = JSON.parse(localStorage.getItem(NOVA_ALERTS_KEY) || "[]");
  const fingerprint = [alert.area, alert.risk, alert.level, alert.message].join("|");
  const recent = alerts.find(a => a.fingerprint === fingerprint && Date.now() - a.createdAt < 6 * 60 * 60 * 1000);
  if (!recent) {
    alerts.unshift({ ...alert, fingerprint, createdAt: Date.now(), read: false });
    localStorage.setItem(NOVA_ALERTS_KEY, JSON.stringify(alerts.slice(0, 50)));
  }
}

async function requestNovaBrowserPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "default") return Notification.requestPermission();
  return Notification.permission;
}

function showNovaBrowserAlert(alert) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  new Notification("Nova-Forest AI", {
    body: alert.area + ": risk " + alert.risk + "/100",
    tag: "nova-" + alert.area + "-" + alert.risk
  });
}

const notifyForm = document.getElementById("notify-form");
if (notifyForm) {
  const saved = getNovaAlertSettings();
  notifyForm.threshold.value = saved.threshold || 70;
  notifyForm.enabled.checked = saved.enabled !== false;

  notifyForm.onsubmit = async (e) => {
    e.preventDefault();
    const enabled = notifyForm.enabled.checked;
    const threshold = Number(notifyForm.threshold.value || 70);
    localStorage.setItem(NOVA_ALERT_SETTINGS_KEY, JSON.stringify({ enabled, threshold }));
    let permission = "disabled";
    if (enabled) permission = await requestNovaBrowserPermission();
    const status = document.querySelector("[data-notify-status]");
    if (status) {
      status.textContent = enabled
        ? (permission === "granted"
          ? "Nova-Alert aktif • uygulama içi + tarayıcı bildirimi."
          : "Nova-Alert aktif • uygulama içi bildirim açık; tarayıcı izni verilmedi.")
        : "Nova-Alert kapalı.";
    }
  };
}

window.NovaAlert = {
  settings: getNovaAlertSettings,
  save: saveNovaAlert,
  browser: showNovaBrowserAlert,
  requestPermission: requestNovaBrowserPermission
};
