/* NexoraWildfire field identity: Supabase Auth + cloud areas. */
(function(){
  const URL="https://ckxgbmvjehshgicafsjp.supabase.co";
  const KEY="sb_publishable_J370jM_6LUMXGfwGfbWK0Q_nR0I6NA2";
  const AREA_KEY="nexorawildfire-my-areas-v1";
  let client=null, session=null, profile=null;
  const root=document.location.pathname.includes("/pages/")?"../":"";
  const esc=s=>String(s??"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  function init(){if(!window.supabase?.createClient)return false;client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return true}
  async function loadProfile(){if(!client||!session)return null;const {data,error}=await client.from("profiles").select("*").eq("id",session.user.id).maybeSingle();if(error)throw error;profile=data;return data}
  async function ensureProfile(){if(!session)return null;let p=await loadProfile();if(!p){const name=session.user.user_metadata?.full_name||session.user.user_metadata?.name||session.user.phone||"Nexora kullanıcısı";const r=await client.from("profiles").insert({id:session.user.id,full_name:name}).select().single();if(!r.error)p=r.data;profile=p}return p}
  function displayName(){return profile?.full_name||session?.user?.user_metadata?.full_name||session?.user?.user_metadata?.name||session?.user?.phone||"Saha kullanıcısı"}
  function initials(){return displayName().split(/\\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"N"}
  function avatar(){return session?.user?.user_metadata?.avatar_url||session?.user?.user_metadata?.picture||""}
  function accountHref(){return root+"pages/account.html"}
  function renderBadge(){
    document.querySelector(".nova-account-dock")?.remove();
    const dock=document.createElement("a");dock.className="nova-account-dock";dock.href=accountHref();dock.title=session?"Profil ve saha merkezi":"Hesap oluştur / giriş yap";
    const img=avatar();dock.innerHTML=img?'<img src="'+esc(img)+'" alt="Profil">':'<span class="nova-avatar-fallback">'+esc(initials())+'</span>';
    dock.insertAdjacentHTML("beforeend",'<span><b>'+(session?esc(displayName()):"HESAP")+'</b><small>'+(session?"Saha profili":"Giriş / kayıt")+'</small></span>');
    document.body.appendChild(dock);
  }
  async function syncAreas(){
    if(!client||!session)return;
    let local=[];try{local=JSON.parse(localStorage.getItem(AREA_KEY)||"[]")}catch{}
    const cloud=await client.from("nexorawildfire_areas").select("*").order("updated_at",{ascending:false});
    if(cloud.error)throw cloud.error;
    const existing=cloud.data||[];const valid=existing.map(a=>({id:String(a.id),name:a.name,type:a.area_type==="field"?"çiftçi":a.area_type==="apiary"?"arıcı":a.area_type==="forest"?"orman":"genel",province:a.province||"",district:a.district||"",coordinates:a.coordinates||[],createdAt:a.created_at,updatedAt:a.updated_at}));
    const known=new Set(existing.map(a=>String(a.name)+"|"+JSON.stringify(a.coordinates)));
    for(const a of local){const key=String(a.name)+"|"+JSON.stringify(a.coordinates);if(!known.has(key)&&Array.isArray(a.coordinates)&&a.coordinates.length>=3){const c=a.coordinates.reduce((z,p)=>[z[0]+Number(p[0]),z[1]+Number(p[1])],[0,0]);const type=a.type?.includes("arı")?"apiary":a.type?.includes("orman")?"forest":a.type?.includes("çift")?"field":"other";const ins=await client.from("nexorawildfire_areas").insert({user_id:session.user.id,name:a.name,area_type:type,province:a.province||null,district:a.district||null,coordinates:a.coordinates,center_lat:c[0]/a.coordinates.length,center_lon:c[1]/a.coordinates.length}).select().single();if(!ins.error)valid.push({id:String(ins.data.id),name:a.name,type:a.type,province:a.province||"",district:a.district||"",coordinates:a.coordinates,createdAt:ins.data.created_at,updatedAt:ins.data.updated_at})}}
    localStorage.setItem(AREA_KEY,JSON.stringify(valid));
    try{for(const a of valid)await window.NovaStore?.put("areas",{...a,id:String(a.id),updatedAt:Date.parse(a.updatedAt||a.createdAt||"")||Date.now()})}catch{}
    window.dispatchEvent(new CustomEvent("nova:areas-synced",{detail:{areas:valid}}));return valid;
  }
  async function saveProfile(data){if(!client||!session)throw new Error("not_authenticated");const clean={full_name:String(data.full_name||"").trim().slice(0,80)||displayName(),role:data.role||"user",notification_preferences:data.notification_preferences||profile?.notification_preferences||{push:true,fire:true,soil:true,pollen:true,threshold:70}};const {data:row,error}=await client.from("profiles").update(clean).eq("id",session.user.id).select().single();if(error)throw error;profile=row;renderBadge();window.dispatchEvent(new CustomEvent("nova:profile-updated",{detail:row}));return row}
  async function saveArea(area){if(!session)throw new Error("login_required");const c=area.coordinates.reduce((z,p)=>[z[0]+Number(p[0]),z[1]+Number(p[1])],[0,0]);const type=area.type?.includes("arı")?"apiary":area.type?.includes("orman")?"forest":area.type?.includes("çift")?"field":"other";const {data,error}=await client.from("nexorawildfire_areas").insert({user_id:session.user.id,name:area.name,area_type:type,province:area.province||null,district:area.district||null,coordinates:area.coordinates,center_lat:c[0]/area.coordinates.length,center_lon:c[1]/area.coordinates.length}).select().single();if(error)throw error;return data}
  async function deleteArea(id){if(!session)return;const {error}=await client.from("nexorawildfire_areas").delete().eq("id",id);if(error)throw error}
  function requireAccount(next){if(session)return true;location.href=accountHref()+"?next="+encodeURIComponent(next||location.pathname+location.search);return false}
  async function start(){if(!init()){window.dispatchEvent(new CustomEvent("nova:auth-ready",{detail:{session:null,profile:null,available:false}}));return}const {data}=await client.auth.getSession();session=data.session;if(session){try{await ensureProfile();await syncAreas()}catch(e){console.warn("Nexora account sync",e)}}renderBadge();window.dispatchEvent(new CustomEvent("nova:auth-ready",{detail:{session,profile}}));client.auth.onAuthStateChange((_event,s)=>{session=s;setTimeout(async()=>{try{if(s){await ensureProfile();await syncAreas()}else{profile=null}}catch(e){console.warn("Nexora auth",e)}renderBadge();window.dispatchEvent(new CustomEvent("nova:auth-ready",{detail:{session,profile}}))},0)});}
  async function awardSeed(action,eventKey){if(!client||!session)throw new Error("not_authenticated");const {data,error}=await client.rpc("award_nexorawildfire_seed",{p_action:action,p_event_key:eventKey});if(error)throw error;return data} async function getSeedWallet(){if(!client||!session)return {points:0,history:[]};const {data,error}=await client.rpc("get_nexorawildfire_seed_wallet");if(error)throw error;return data||{points:0,history:[]}}
  window.NovaAuth={client:()=>client,session:()=>session,profile:()=>profile,displayName,signOut:()=>client?.auth.signOut(),saveProfile,syncAreas,saveArea,deleteArea,requireAccount,isLoggedIn:()=>!!session,awardSeed,getSeedWallet};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
