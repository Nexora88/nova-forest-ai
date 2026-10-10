/* Historical chart for daily snapshots stored in Supabase; no placeholder points. */
(() => {
  const AREA_KEY = "nexorawildfire-my-areas-v1";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function init() {
    const areaGrid = document.getElementById("areas");
    if (!areaGrid || document.querySelector("[data-daily-history]")) return;
    const panel = document.createElement("section");
    panel.className = "daily-history-panel";
    panel.dataset.dailyHistory = "true";
    panel.innerHTML = '<div class="eyebrow">NEXORA / TIME SERIES</div><h2>Kalıcı çevresel geçmiş</h2><p>Supabase veritabanına kaydedilmiş günlük Open-Meteo gözlemlerini seçili alan için incele. Kayıt yoksa grafik üretmek yerine bunu açıkça belirtir.</p><div class="daily-history-controls"><label for="daily-history-area">Alan</label><select id="daily-history-area"><option value="">Alan seç…</option></select><button type="button" data-history-load>Geçmişi getir</button></div><div data-history-status role="status" aria-live="polite">Günlük geçmişi görmek için giriş yapmış olmalı, migration uygulanmış ve zamanlanmış görev en az bir kez çalışmış olmalıdır.</div><div data-history-chart class="daily-history-chart"></div><div class="daily-history-legend"><span>● Sıcaklık (°C)</span><span>● Nem (%)</span><span>● Rüzgâr (km/h)</span></div>';
    areaGrid.parentNode.insertBefore(panel, areaGrid);
    const select = panel.querySelector("select");
    const status = panel.querySelector("[data-history-status]");
    const chart = panel.querySelector("[data-history-chart]");
    function fillAreas() {
      let areas=[]; try { areas=JSON.parse(localStorage.getItem(AREA_KEY)||"[]"); } catch {}
      const previous=select.value;
      select.innerHTML='<option value="">Alan seç…</option>'+areas.filter(a=>a?.id!=null).map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name||"Adsız alan")+'</option>').join("");
      if (previous && areas.some(a=>String(a.id)===previous)) select.value=previous;
    }
    function render(rows) {
      if (!rows.length) { chart.innerHTML=""; status.textContent="Bu alan için henüz günlük kayıt yok. Görev çalıştıktan sonra geçmiş burada görünür."; return; }
      const width=720,height=240,pad=36;
      const series=[
        {key:"temperature_c",label:"Sıcaklık",color:"#00ff66",min:Math.min(0,...rows.map(r=>Number(r.temperature_c)||0)),max:Math.max(1,...rows.map(r=>Number(r.temperature_c)||0))},
        {key:"relative_humidity_pct",label:"Nem",color:"#38bdf8",min:0,max:100},
        {key:"wind_speed_kmh",label:"Rüzgâr",color:"#f59e0b",min:0,max:Math.max(10,...rows.map(r=>Number(r.wind_speed_kmh)||0))}
      ];
      const x=i=>pad+(rows.length<2?0:i*(width-2*pad)/(rows.length-1));
      const lines=series.map(s=>{
        const values=rows.map(r=>r[s.key]==null?null:Number(r[s.key]));
        const points=values.map((v,i)=>v==null?null:[x(i),height-pad-(v-s.min)/(s.max-s.min||1)*(height-2*pad)]).filter(Boolean);
        return '<polyline fill="none" stroke="'+s.color+'" stroke-width="2.5" points="'+points.map(p=>p.join(",")).join(" ")+'"/>';
      }).join("");
      const dates=rows.map(r=>r.snapshot_date);
      const first=esc(dates[0]),last=esc(dates[dates.length-1]);
      chart.innerHTML='<svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Daily weather history line chart"><line x1="'+pad+'" y1="'+(height-pad)+'" x2="'+(width-pad)+'" y2="'+(height-pad)+'" stroke="#31533b"/><line x1="'+pad+'" y1="'+pad+'" x2="'+pad+'" y2="'+(height-pad)+'" stroke="#31533b"/>'+lines+'<text x="'+pad+'" y="'+(height-8)+'" fill="#9eb7a5" font-size="11">'+first+'</text><text x="'+(width-pad)+'" y="'+(height-8)+'" fill="#9eb7a5" font-size="11" text-anchor="end">'+last+'</text></svg>';
      status.textContent=rows.length+" günlük kayıt yüklendi. Kaynak: Open-Meteo; değerler kayıt anındaki hava gözlemleridir, yangın olayı veya yangın olasılığı değildir.";
    }
    async function load() {
      const areaId=select.value;
      if (!areaId) { status.textContent="Önce bir alan seç."; chart.innerHTML=""; return; }
      const auth=window.NovaAuth;
      if (!auth?.isLoggedIn?.() || !auth.client?.()) { status.textContent="Kalıcı geçmiş için hesabına giriş yap."; chart.innerHTML=""; return; }
      status.textContent="Supabase geçmişi yükleniyor…";
      try {
        const {data,error}=await auth.client().from("nexorawildfire_daily_snapshots").select("snapshot_date,temperature_c,relative_humidity_pct,wind_speed_kmh,rule_based_indicator,data_source").eq("area_id",String(areaId)).order("snapshot_date",{ascending:true}).limit(365);
        if (error) throw error;
        render(data||[]);
      } catch (error) {
        chart.innerHTML="";
        status.textContent="Geçmiş yüklenemedi. Migration uygulanmış mı ve RLS izinleri doğru mu kontrol et. ("+(error?.message||"Supabase error")+")";
      }
    }
    panel.querySelector("[data-history-load]").addEventListener("click",load);
    fillAreas();
    window.addEventListener("nova:areas-synced",fillAreas);
    window.addEventListener("nova:auth-ready",fillAreas);
    window.addEventListener("storage",fillAreas);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
