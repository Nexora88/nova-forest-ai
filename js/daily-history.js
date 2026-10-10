/* Daily environmental history. Uses only rows persisted in Supabase; never fabricates chart points. */
(() => {
  const rootSelector = "[data-daily-history]";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function init() {
    const root = document.querySelector(rootSelector);
    if (!root || root.dataset.historyInitialized === "true") return;
    root.dataset.historyInitialized = "true";
    const status = root.querySelector("[data-history-status]");
    const chart = root.querySelector("[data-history-chart]");
    const summary = root.querySelector("[data-history-summary]");
    let channel = null;
    const say = message => { if (status) status.textContent = message; };
    function render(rows) {
      if (!rows.length) {
        if (chart) chart.innerHTML = '<div class="nx-history-empty">Henüz kayıtlı günlük gözlem yok. Alanını hesabına eşitle ve zamanlanmış veri toplama görevinin çalışmasını bekle.</div>';
        if (summary) summary.textContent = "Veritabanında kayıt bulunamadı";
        say("Supabase bağlantısı kuruldu; bu kullanıcı için henüz günlük kayıt yok. Boş grafik, sıfır risk anlamına gelmez.");
        return;
      }
      const width=760,height=250,pad=42;
      const series=[
        {key:"temperature_c",label:"Sıcaklık (°C)",color:"#00ff66"},
        {key:"relative_humidity_pct",label:"Bağıl nem (%)",color:"#38bdf8"},
        {key:"wind_speed_kmh",label:"Rüzgâr (km/h)",color:"#f59e0b"}
      ];
      const dates=rows.map(r=>r.snapshot_date);
      const values=series.flatMap(s=>rows.map(r=>r[s.key]).filter(v=>v!==null&&v!==undefined).map(Number));
      const min=Math.min(0,...values),max=Math.max(1,...values);
      const x=i=>pad+(rows.length<2?0:i*(width-2*pad)/(rows.length-1));
      const y=v=>height-pad-(Number(v)-min)/(max-min||1)*(height-2*pad);
      const lines=series.map(s=>{
        const pts=rows.map((r,i)=>r[s.key]==null?null:[x(i),y(r[s.key])]).filter(Boolean);
        return '<polyline fill="none" stroke="'+s.color+'" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="'+pts.map(p=>p.join(",")).join(" ")+'"/>';
      }).join("");
      if(chart) chart.innerHTML='<svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Supabase üzerinde kayıtlı günlük çevre gözlemleri"><line x1="'+pad+'" y1="'+(height-pad)+'" x2="'+(width-pad)+'" y2="'+(height-pad)+'" stroke="#31533b"/><line x1="'+pad+'" y1="'+pad+'" x2="'+pad+'" y2="'+(height-pad)+'" stroke="#31533b"/>'+lines+'<text x="'+pad+'" y="'+(height-10)+'" fill="#9eb7a5" font-size="11">'+esc(dates[0])+'</text><text x="'+(width-pad)+'" y="'+(height-10)+'" text-anchor="end" fill="#9eb7a5" font-size="11">'+esc(dates[dates.length-1])+'</text></svg>';
      if(summary) summary.textContent=rows.length+" gerçek günlük kayıt · "+dates[0]+" — "+dates[dates.length-1];
      say("Yalnızca Supabase'de saklanan gözlemler gösteriliyor. Çizgiler farklı birimlerdeki göstergeleri ortak görsel ölçeğe taşır; birbirleriyle doğrudan karşılaştırılmamalıdır.");
    }
    async function load() {
      const auth=window.NovaAuth;
      const client=auth?.client?.();
      const session=auth?.session?.();
      if(!client || !session?.user?.id) { say("Kalıcı geçmişi görmek için giriş yap ve Supabase bağlantısının hazır olmasını bekle."); return; }
      say("Kayıtlı alanlar ve günlük geçmiş yükleniyor…");
      try {
        const {data:areas,error:areasError}=await client.from("nexorawildfire_areas").select("id,name").eq("user_id",session.user.id);
        if(areasError) throw areasError;
        if(!areas?.length){render([]);say("Henüz Supabase hesabına eşitlenmiş alan yok. Bir alan oluşturup hesabına eşitle.");return;}
        const ids=areas.map(a=>a.id);
        const {data,error}=await client.from("nexorawildfire_daily_snapshots").select("area_id,area_name,snapshot_date,temperature_c,relative_humidity_pct,wind_speed_kmh,precipitation_mm,soil_moisture_m3m3,vapor_pressure_deficit_kpa,et0_mm,provider").in("area_id",ids).order("snapshot_date",{ascending:true}).limit(1000);
        if(error) throw error;
        const rows=data||[];
        if(channel){client.removeChannel(channel);channel=null;}
        channel=client.channel("nxwf-daily-history-"+session.user.id).on("postgres_changes",{event:"*",schema:"public",table:"nexorawildfire_daily_snapshots",filter:"user_id=eq."+session.user.id},()=>load()).subscribe();
        render(rows);
      } catch(error) {
        if(chart) chart.innerHTML="";
        say("Geçmiş yüklenemedi: "+(error?.message||"Supabase bağlantı hatası")+". Tablo, RLS ve hesap alanı eşitlemesini kontrol et.");
      }
    }
    window.addEventListener("nova:auth-ready",load);
    window.addEventListener("nova:areas-synced",load);
    window.addEventListener("online",load);
    if(window.NovaAuth?.session?.()) load();
    else say("Supabase oturum durumu bekleniyor…");
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true}); else init();
})();
