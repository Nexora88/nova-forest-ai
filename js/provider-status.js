/* Per-provider status panel. Network connectivity never implies provider health. */
(function(){
  const labels={firms:"NASA FIRMS · termal anomaliler",weather:"Open-Meteo · hava durumu",air:"Open-Meteo / CAMS · hava kalitesi",satellite:"NASA GIBS · uydu görüntüsü",marine:"Open-Meteo · deniz",elevation:"Open-Meteo · yükselti",usgs:"USGS · deprem gözlemleri",firmsKey:"NASA FIRMS · MAP_KEY doğrulaması",sentinelKey:"Copernicus · CDSE doğrulaması"};
  const stateLabels={loading:"Kontrol ediliyor",ok:"Yanıt alındı",error:"Hata / doğrulanamadı",empty:"Başarılı · boş sonuç",unknown:"Henüz doğrulanmadı","not-loaded":"Henüz istenmedi"};
  const state={};Object.keys(labels).forEach(k=>state[k]={state:(k==="firms"||k==="firmsKey"||k==="sentinelKey")?"unknown":"not-loaded",detail:k==="firms"?"FIRMS gözlemi henüz doğrulanmadı":(k==="firmsKey"||k==="sentinelKey")?"Sunucu tarafı kimlik bilgisi henüz doğrulanmadı":"Katman henüz istenmedi",checkedAt:null,observedAt:null});
  function time(v){if(!v)return "yok";const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString("tr-TR",{timeZone:"Europe/Istanbul",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"});}
  function render(){
    const list=document.querySelector("[data-provider-status-list]");if(!list)return;
    list.replaceChildren();
    Object.entries(state).forEach(([key,item])=>{
      const row=document.createElement("article");row.className="provider-status-row";row.dataset.providerKey=key;
      const top=document.createElement("div");top.className="provider-status-top";
      const title=document.createElement("strong");title.textContent=labels[key];
      const badge=document.createElement("span");badge.className="provider-state provider-state-"+item.state;badge.textContent=stateLabels[item.state]||item.state;
      const detail=document.createElement("p");detail.className="provider-status-detail";detail.textContent=item.detail||"Ayrıntı yok.";
      const times=document.createElement("small");times.className="provider-status-times";times.textContent="Son kontrol: "+time(item.checkedAt)+" · Kaynak gözlemi: "+time(item.observedAt);
      top.append(title,badge);row.append(top,detail,times);list.append(row);
    });
  }
  function mount(){
    if(document.querySelector("[data-provider-status]"))return;
    const panel=document.createElement("section");panel.className="provider-status-panel";panel.dataset.providerStatus="";panel.setAttribute("aria-labelledby","provider-status-title");
    const head=document.createElement("div");head.className="provider-status-heading";
    const title=document.createElement("strong");title.id="provider-status-title";title.textContent="VERİ KAYNAĞI DURUMU";
    const note=document.createElement("p");note.textContent="İnternet bağlantısı, sağlayıcının çalıştığını veya verinin güncel olduğunu kanıtlamaz.";
    head.append(title,note);
    const list=document.createElement("div");list.className="provider-status-list";list.dataset.providerStatusList="";
    panel.append(head,list);
    const mapSection=document.querySelector(".map-section");
    const toolbar=mapSection?.querySelector(".map-toolbar");
    if(mapSection?.parentNode)mapSection.parentNode.insertBefore(panel,mapSection);
    render();
    verifySatelliteCredentials();
  }
  async function verifySatelliteCredentials(){
    const base=(window.NOVA_API_BASE||"/api").replace(/\/$/,"");
    window.NovaProviderStatus.update("firmsKey","loading","NASA FIRMS anahtarı sunucu tarafında doğrulanıyor…");
    window.NovaProviderStatus.update("sentinelKey","loading","Copernicus CDSE kimlik bilgileri sunucu tarafında doğrulanıyor…");
    try{
      const response=await fetch(base+"/satellite/providers/status?probe=true",{cache:"no-store"});
      if(!response.ok)throw new Error("HTTP "+response.status);
      const payload=await response.json(),providers=payload.providers||{};
      const firms=providers.nasa_firms||{},sentinel=providers.copernicus_sentinel_hub||{};
      window.NovaProviderStatus.update("firmsKey",firms.status==="authorized"?"ok":"error",
        firms.status==="authorized"?"NASA FIRMS anahtarı kabul edildi; gizli değer gösterilmedi.":
        firms.status==="not_configured"?"FIRMS_MAP_KEY sunucuda bulunamadı.":"NASA FIRMS anahtarı doğrulanamadı ("+firms.status+").");
      window.NovaProviderStatus.update("sentinelKey",sentinel.status==="authorized"?"ok":"error",
        sentinel.status==="authorized"?"Copernicus erişim belirteci alındı; kimlik bilgileri gizli tutuldu.":
        sentinel.status==="not_configured"?"CDSE_CLIENT_ID / CDSE_CLIENT_SECRET sunucuda bulunamadı.":"Copernicus kimlik doğrulaması tamamlanamadı ("+sentinel.status+").");
    }catch(error){
      window.NovaProviderStatus.update("firmsKey","error","Sunucu sağlayıcı kontrolüne ulaşılamadı; anahtar durumu doğrulanamadı.");
      window.NovaProviderStatus.update("sentinelKey","error","Sunucu sağlayıcı kontrolüne ulaşılamadı; kimlik bilgileri doğrulanamadı.");
    }
  }
  window.NovaProviderStatus={
    update(key,nextState,detail,observedAt){
      if(!state[key]||!["loading","ok","error","empty","unknown","not-loaded"].includes(nextState))return;
      state[key]={state:nextState,detail:String(detail||""),checkedAt:new Date().toISOString(),observedAt:observedAt||null};render();
    },
    snapshot(){return JSON.parse(JSON.stringify(state));}
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();