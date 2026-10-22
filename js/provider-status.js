/* Per-provider status panel. Network connectivity never implies provider health. */
(function(){
  const labels={firms:"NASA FIRMS · termal anomaliler",weather:"Open-Meteo · hava durumu",air:"Open-Meteo / CAMS · hava kalitesi",satellite:"NASA GIBS · uydu görüntüsü",marine:"Open-Meteo · deniz",elevation:"Open-Meteo · yükselti",usgs:"USGS · deprem gözlemleri"};
  const stateLabels={loading:"Kontrol ediliyor",ok:"Yanıt alındı",error:"Hata / doğrulanamadı",empty:"Başarılı · boş sonuç",unknown:"Henüz doğrulanmadı","not-loaded":"Henüz istenmedi"};
  const state={};Object.keys(labels).forEach(k=>state[k]={state:k==="firms"?"unknown":"not-loaded",detail:k==="firms"?"FIRMS kontrolü bekleniyor":"Katman henüz istenmedi",checkedAt:null,observedAt:null});
  function time(v){if(!v)return "yok";const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString("tr-TR",{timeZone:"Europe/Istanbul"})}
  function render(){
    const list=document.querySelector("[data-provider-status-list]");if(!list)return;
    list.replaceChildren();
    Object.entries(state).forEach(([key,item])=>{
      const row=document.createElement("div");row.className="provider-status-row";
      const title=document.createElement("strong");title.textContent=labels[key];
      const badge=document.createElement("span");badge.className="provider-state provider-state-"+item.state;badge.textContent=stateLabels[item.state]||item.state;
      const detail=document.createElement("small");detail.textContent=item.detail;
      const times=document.createElement("small");times.textContent="Son kontrol: "+time(item.checkedAt)+" · Kaynak gözlemi: "+time(item.observedAt);
      row.append(title,badge,detail,times);list.append(row);
    });
  }
  function mount(){
    if(document.querySelector("[data-provider-status]"))return;
    const panel=document.createElement("section");panel.className="provider-status-panel";panel.dataset.providerStatus="";panel.setAttribute("aria-labelledby","provider-status-title");panel.setAttribute("aria-live","polite");
    const title=document.createElement("strong");title.id="provider-status-title";title.textContent="VERİ KAYNAĞI DURUMU";
    const note=document.createElement("small");note.textContent="İnternet bağlantısı, sağlayıcının çalıştığını veya verinin güncel olduğunu kanıtlamaz.";
    const list=document.createElement("div");list.dataset.providerStatusList="";
    panel.append(title,note,list);document.querySelector(".map-section")?.append(panel);render();
  }
  window.NovaProviderStatus={update(key,nextState,detail,observedAt){if(!state[key])return;state[key]={state:nextState,detail:String(detail||""),checkedAt:new Date().toISOString(),observedAt:observedAt||null};render();},snapshot(){return JSON.parse(JSON.stringify(state));}};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();
