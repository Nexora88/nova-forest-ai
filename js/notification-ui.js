const NOVA_ALERT_SETTINGS_KEY="nexorawildfire-alert-settings-v3";
const NOVA_ALERTS_KEY="nexorawildfire-alerts-v1";
const PUSH_AREA_KEY="nexorawildfire-push-area-v1";
const PUSH_API=(window.NOVA_API_BASE||"").replace(/\/$/,"");

function getNovaAlertSettings(){try{return JSON.parse(localStorage.getItem(NOVA_ALERT_SETTINGS_KEY)||'{"enabled":true,"threshold":70}')}catch{return {enabled:true,threshold:70}}}
function novaSeverity(alert){const risk=Number(alert?.risk);if(!Number.isFinite(risk))return {key:"info",label:"BİLGİ",icon:"ℹ️"};if(risk>=90)return {key:"critical",label:"KRİTİK",icon:"🚨"};if(risk>=75)return {key:"high",label:"YÜKSEK",icon:"🔴"};if(risk>=50)return {key:"warning",label:"DİKKAT",icon:"🟠"};return {key:"info",label:"BİLGİ",icon:"🟢"}}
function saveNovaAlert(alert){const settings=getNovaAlertSettings();if(settings.enabled===false)return false;const severity=novaSeverity(alert),threshold=Math.max(25,Math.min(100,Number(settings.threshold)||70)),risk=Number(alert?.risk);if(!Number.isFinite(risk)||risk<threshold)return false;const alerts=JSON.parse(localStorage.getItem(NOVA_ALERTS_KEY)||"[]");const fingerprint=[alert.area,risk,severity.key,alert.message].join("|");if(alerts.find(a=>a.fingerprint===fingerprint&&Date.now()-a.createdAt<21600000))return false;const item={...alert,risk,level:severity.key,severity:severity.label,fingerprint,createdAt:Date.now(),read:false};alerts.unshift(item);localStorage.setItem(NOVA_ALERTS_KEY,JSON.stringify(alerts.slice(0,50)));showNovaBrowserAlert(item);window.dispatchEvent(new CustomEvent("nova:alert-created",{detail:item}));return true}
async function requestNovaBrowserPermission(){if(!("Notification"in window))return"unsupported";if(Notification.permission==="default")return Notification.requestPermission();return Notification.permission}
function showNovaBrowserAlert(alert){if(!("Notification"in window)||Notification.permission!=="granted")return;const s=novaSeverity(alert);try{new Notification(s.icon+" Nexora-Alert · "+s.label,{body:(alert.area||"Seçilen alan")+": risk "+alert.risk+"/100. "+(alert.message||"Çevresel eşik aşıldı."),tag:"nova-"+(alert.area||"area")+"-"+s.key,renotify:s.key==="critical"||s.key==="high"})}catch{}}
function urlBase64ToUint8Array(base64String){const padding="=".repeat((4-base64String.length%4)%4);const base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");const raw=atob(base64);return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))}
async function registerWebPush(area){
  if(!("serviceWorker"in navigator)||!("PushManager"in window))return{ok:false,reason:"unsupported"};
  const session=window.NovaAuth?.session();if(!session?.access_token)return{ok:false,reason:"login_required"};
  const permission=await requestNovaBrowserPermission();
  if(permission!=="granted")return{ok:false,reason:"permission"};
  const reg=await navigator.serviceWorker.ready;
  let cfg;
  try{cfg=await (await fetch(PUSH_API+"/notifications/push/config")).json()}catch{return{ok:false,reason:"server"}}
  if(!cfg.enabled||!cfg.publicKey)return{ok:false,reason:"server"};
  let sub=await reg.pushManager.getSubscription();
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(cfg.publicKey)});
  const settings=getNovaAlertSettings();
  const payload={subscription:sub.toJSON(),lat:Number(area.lat),lon:Number(area.lon),area_name:area.name,threshold:Number(settings.threshold||70)};
  const r=await fetch(PUSH_API+"/notifications/push/subscribe",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+session.access_token},body:JSON.stringify(payload)});
  if(!r.ok)throw new Error("push subscribe failed");
  localStorage.setItem(PUSH_AREA_KEY,JSON.stringify(area));
  return{ok:true};
}
async function enableNovaWebPush(area){try{return await registerWebPush(area)}catch{return{ok:false,reason:"error"}}}
const notifyForm=document.getElementById("notify-form");
if(notifyForm){
  const saved=getNovaAlertSettings();
  notifyForm.threshold.value=saved.threshold||70;
  notifyForm.enabled.checked=saved.enabled!==false;
  notifyForm.onsubmit=async e=>{
    e.preventDefault();
    const enabled=notifyForm.enabled.checked;
    const threshold=Math.max(25,Math.min(100,Number(notifyForm.threshold.value||70)));
    localStorage.setItem(NOVA_ALERT_SETTINGS_KEY,JSON.stringify({enabled,threshold}));
    const status=document.querySelector("[data-notify-status]");
    if(!enabled){if(status)status.textContent="Nova-Alert kapalı.";return}
    const permission=await requestNovaBrowserPermission();
    if(permission!=="granted"){if(status)status.textContent="Nova-Alert yerel olarak açık; tarayıcı bildirim izni verilmedi.";return}
    const area=JSON.parse(localStorage.getItem(PUSH_AREA_KEY)||"null")||{name:"Genel Nova-Alert",lat:41.0082,lon:28.9784};
    const result=await enableNovaWebPush(area);
    if(status)status.textContent=result.ok?"Nova-Alert aktif • hesap ve sunucu Web Push aboneliği kaydedildi.":result.reason==="login_required"?"Tarayıcı izni açık. Kişisel arka plan bildirimi için hesabına giriş yap.":result.reason==="server"?"Tarayıcı izni açık; sunucu VAPID/Supabase anahtarları henüz yapılandırılmadı.":result.reason==="permission"?"Tarayıcı bildirim izni verilmedi.":"Tarayıcı izni açık; Web Push kurulumu tamamlanamadı.";
  };
}
window.NovaAlert={settings:getNovaAlertSettings,save:saveNovaAlert,browser:showNovaBrowserAlert,severity:novaSeverity,requestPermission:requestNovaBrowserPermission,enablePush:enableNovaWebPush};
