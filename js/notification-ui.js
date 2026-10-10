const NOVA_ALERT_SETTINGS_KEY="nexorawildfire-alert-settings-v3";
const NOVA_ALERTS_KEY="nexorawildfire-alerts-v1";
const PUSH_AREA_KEY="nexorawildfire-push-area-v1";
const PUSH_API=(window.NOVA_API_BASE||"").replace(/\/$/,"");

function getNovaAlertSettings(){return JSON.parse(localStorage.getItem(NOVA_ALERT_SETTINGS_KEY)||'{"enabled":true,"threshold":70}')}
function saveNovaAlert(alert){const alerts=JSON.parse(localStorage.getItem(NOVA_ALERTS_KEY)||"[]");const fingerprint=[alert.area,alert.risk,alert.level,alert.message].join("|");if(!alerts.find(a=>a.fingerprint===fingerprint&&Date.now()-a.createdAt<21600000)){alerts.unshift({...alert,fingerprint,createdAt:Date.now(),read:false});localStorage.setItem(NOVA_ALERTS_KEY,JSON.stringify(alerts.slice(0,50)))}}
async function requestNovaBrowserPermission(){if(!("Notification"in window))return"unsupported";if(Notification.permission==="default")return Notification.requestPermission();return Notification.permission}
function showNovaBrowserAlert(alert){if(!("Notification"in window)||Notification.permission!=="granted")return;new Notification("NexoraWildfire AI",{body:alert.area+": risk "+alert.risk+"/100",tag:"nova-"+alert.area+"-"+alert.risk})}
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
    const threshold=Number(notifyForm.threshold.value||70);
    localStorage.setItem(NOVA_ALERT_SETTINGS_KEY,JSON.stringify({enabled,threshold}));
    let permission="disabled";
    if(enabled)permission=await requestNovaBrowserPermission();
    const status=document.querySelector("[data-notify-status]");
    if(status)status.textContent=enabled?(permission==="granted"?"Nova-Alert aktif • cihaz bildirimi için Web Push hazır.":"Nova-Alert aktif • tarayıcı izni verilmedi."):"Nova-Alert kapalı.";
  };
}
window.NovaAlert={settings:getNovaAlertSettings,save:saveNovaAlert,browser:showNovaBrowserAlert,requestPermission:requestNovaBrowserPermission,enablePush:enableNovaWebPush};
