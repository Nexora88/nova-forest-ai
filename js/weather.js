async function loadWeatherData(){
  const cards=document.querySelectorAll(".card");
  const status=document.querySelector(".status");
  const setStatus=(ok)=>{
    if(!status)return;
    const textNode=[...status.childNodes].find(node=>node.nodeType===3&&node.textContent.trim());
    if(textNode)textNode.textContent="\n\n"+(ok?"CANLI HAVA VERİSİ":"VERİ YOK")+"\n\n";
  };
  const unavailable=()=>{
    [0,1,2].forEach(i=>{const value=cards[i]?.querySelector("strong");if(value)value.textContent="—"});
    const state=cards[3]?.querySelector("strong");if(state)state.textContent="VERİ YOK";
    const detail=cards[3]?.querySelector("p");if(detail)detail.textContent="Hava API'si erişilemedi; risk skoru üretilmedi.";
    setStatus(false);
  };
  try{
    const regions={Edirne:[41.6771,26.5557],Tekirdag:[40.9781,27.5110],Kirklareli:[41.7355,27.2252],Canakkale:[40.1553,26.4142],Istanbul:[41.1500,28.6500]};
    const [lat,lon]=regions.Edirne;
    const u=new URL("https://api.open-meteo.com/v1/forecast");
    u.searchParams.set("latitude",lat);u.searchParams.set("longitude",lon);
    u.searchParams.set("current","temperature_2m,relative_humidity_2m,wind_speed_10m");
    u.searchParams.set("timezone","Europe/Istanbul");
    const response=await fetch(u);
    if(!response.ok)throw new Error("Open-Meteo HTTP "+response.status);
    const j=await response.json();
    if(j.error)throw new Error(j.reason||"Open-Meteo error");
    const c=j.current||{};
    const values=[c.temperature_2m,c.relative_humidity_2m,c.wind_speed_10m].map(Number);
    if(values.some((v,i)=>c[["temperature_2m","relative_humidity_2m","wind_speed_10m"][i]]===null||c[["temperature_2m","relative_humidity_2m","wind_speed_10m"][i]]===undefined||!Number.isFinite(v)))throw new Error("Required weather values are missing");
    if(cards[0])cards[0].querySelector("strong").textContent=values[0].toFixed(1)+" °C";
    if(cards[1])cards[1].querySelector("strong").textContent=values[1].toFixed(0)+" %";
    if(cards[2])cards[2].querySelector("strong").textContent=values[2].toFixed(1)+" km/h";
    const state=cards[3]?.querySelector("strong");if(state)state.textContent="GÖZLEM HAZIR";
    const detail=cards[3]?.querySelector("p");if(detail)detail.textContent="Güncel hava yanıtı alındı; bu kart yangın tahmini değildir.";
    setStatus(true);
  }catch(error){
    console.warn("NexoraWildfire weather data unavailable",error);
    unavailable();
  }
}
loadWeatherData();
