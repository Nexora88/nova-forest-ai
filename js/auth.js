/* NexoraWildfire field identity: Supabase Auth + cloud areas. */
(function(){
  const URL="https://ckxgbmvjehshgicafsjp.supabase.co";
  const KEY="sb_publishable_J370jM_6LUMXGfwGfbWK0Q_nR0I6NA2";
  const AREA_KEY="nexorawildfire-my-areas-v1";
  const PROFILE_CACHE_KEY="nexorawildfire-profile-cache-v1";
  const PROFILE_CACHE_TTL=600000;
  let client=null, session=null, profile=null;
  const root=document.location.pathname.includes("/pages/")?"../":"";
  const esc=s=>String(s??"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  function init(){if(!window.supabase?.createClient)return false;client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return true}
  function cachedProfile(id){try{const c=JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY)||"null");return c?.userId===id&&c.profile&&Date.now()-c.savedAt<PROFILE_CACHE_TTL?c.profile:null}catch{return null}}
  function cacheProfile(row){if(session&&row){try{localStorage.setItem(PROFILE_CACHE_KEY,JSON.stringify({userId:session.user.id,savedAt:Date.now(),profile:row}))}catch{}}}
  async function loadProfile(){if(!client||!session)return null;const {data,error}=await client.from("profiles").select("*").eq("id",session.user.id).maybeSingle();if(error)throw error;profile=data;cacheProfile(data);return data}
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
  const AREA_DELETE_QUEUE_KEY="nexorawildfire-area-delete-queue-v1";
  const areaTypeToDb=type=>type?.includes("arı")?"apiary":type?.includes("orman")?"forest":type?.includes("çift")?"field":"other";
  const dbAreaToLocal=a=>({id:String(a.id),name:a.name,type:a.area_type==="field"?"çiftçi":a.area_type==="apiary"?"arıcı":a.area_type==="forest"?"orman":"genel",province:a.province||"",district:a.district||"",coordinates:a.coordinates||[],createdAt:a.created_at,updatedAt:a.updated_at,syncStatus:"synced"});
  const areaKeyOf=a=>String(a?.name||"")+"|"+JSON.stringify(a?.coordinates||[]);
  async function syncAreas(){
    if(!client||!session)return;
    // Process queued deletions first. Keep failed tombstones for the next online retry.
    let tombstones=[];try{tombstones=JSON.parse(localStorage.getItem(AREA_DELETE_QUEUE_KEY)||"[]")}catch{}
    if(tombstones.length&&navigator.onLine){
      const pending=[];
      for(const id of tombstones){
        try{const {error}=await client.from("nexorawildfire_areas").delete().eq("id",String(id)).eq("user_id",session.user.id);if(error)throw error}
        catch(e){pending.push(String(id));console.warn("Nexora queued area deletion",e)}
      }
      localStorage.setItem(AREA_DELETE_QUEUE_KEY,JSON.stringify(pending));
    }
    let local=[];try{local=JSON.parse(localStorage.getItem(AREA_KEY)||"[]")}catch{}
    // Fetch the cloud first; if this fails, do not overwrite the offline local copy.
    const cloud=await client.from("nexorawildfire_areas").select("*").order("updated_at",{ascending:false});
    if(cloud.error)throw cloud.error;
    const existing=cloud.data||[];
    const valid=existing.map(dbAreaToLocal);
    const cloudIds=new Set(existing.map(a=>String(a.id)));
    const cloudKeys=new Set(existing.map(areaKeyOf));
    for(const a of local){
      if(!a||!Array.isArray(a.coordinates)||a.coordinates.length<3)continue;
      const id=String(a.id??"");
      if(cloudIds.has(id)||(a.cloudId&&cloudIds.has(String(a.cloudId)))||cloudKeys.has(areaKeyOf(a)))continue;
      // Offline-created or previously failed records stay on-device until a successful insert.
      if(navigator.onLine){
        try{
          const c=a.coordinates.reduce((z,p)=>[z[0]+Number(p[0]),z[1]+Number(p[1])],[0,0]);
          const {data,error}=await client.from("nexorawildfire_areas").insert({user_id:session.user.id,name:a.name,area_type:areaTypeToDb(a.type),province:a.province||null,district:a.district||null,coordinates:a.coordinates,center_lat:c[0]/a.coordinates.length,center_lon:c[1]/a.coordinates.length}).select().single();
          if(error)throw error;
          const synced=dbAreaToLocal(data);valid.push(synced);cloudIds.add(String(data.id));cloudKeys.add(areaKeyOf(synced));
          continue;
        }catch(e){console.warn("Nexora area upload pending",e)}
      }
      valid.push({...a,id:id||String(crypto.randomUUID?.()||Date.now()),syncStatus:"pending",syncError:navigator.onLine?"upload_failed":"offline"});
    }
    // Never discard local-only items because a cloud insert failed; merge by ID and geometry.
    const merged=new Map();
    for(const a of valid){const key=String(a.id||"");if(key)merged.set(key,a)}
    const finalAreas=Array.from(merged.values());
    localStorage.setItem(AREA_KEY,JSON.stringify(finalAreas));
    try{for(const a of finalAreas)await window.NovaStore?.put("areas",{...a,id:String(a.id),updatedAt:Date.parse(a.updatedAt||a.createdAt||"")||Number(a.updatedAt)||Date.now()})}catch(e){console.warn("Nexora IndexedDB area merge",e)}
    window.dispatchEvent(new CustomEvent("nova:areas-synced",{detail:{areas:finalAreas,pending:finalAreas.filter(a=>a.syncStatus==="pending").length}}));
    return finalAreas;
  }
  async function saveProfile(data){if(!client||!session)throw new Error("not_authenticated");const clean={full_name:String(data.full_name||"").trim().slice(0,80)||displayName(),role:data.role||"user",notification_preferences:data.notification_preferences||profile?.notification_preferences||{push:true,fire:true,soil:true,pollen:true,threshold:70}};const {data:row,error}=await client.from("profiles").update(clean).eq("id",session.user.id).select().single();if(error)throw error;profile=row;cacheProfile(row);renderBadge();window.dispatchEvent(new CustomEvent("nova:profile-updated",{detail:row}));return row}
  async function saveArea(area){if(!session)throw new Error("login_required");const c=area.coordinates.reduce((z,p)=>[z[0]+Number(p[0]),z[1]+Number(p[1])],[0,0]);const type=area.type?.includes("arı")?"apiary":area.type?.includes("orman")?"forest":area.type?.includes("çift")?"field":"other";const {data,error}=await client.from("nexorawildfire_areas").insert({user_id:session.user.id,name:area.name,area_type:type,province:area.province||null,district:area.district||null,coordinates:area.coordinates,center_lat:c[0]/area.coordinates.length,center_lon:c[1]/area.coordinates.length}).select().single();if(error)throw error;return data}
  async function deleteArea(id){
    const key=String(id);
    if(session&&navigator.onLine){
      const {error}=await client.from("nexorawildfire_areas").delete().eq("id",key).eq("user_id",session.user.id);
      if(error)throw error;
    }else if(session){
      let queue=[];try{queue=JSON.parse(localStorage.getItem(AREA_DELETE_QUEUE_KEY)||"[]")}catch{}
      if(!queue.includes(key))queue.push(key);
      localStorage.setItem(AREA_DELETE_QUEUE_KEY,JSON.stringify(queue));
    }
    let local=[];try{local=JSON.parse(localStorage.getItem(AREA_KEY)||"[]")}catch{}
    local=local.filter(a=>String(a.id)!==key&&String(a.cloudId||"")!==key);
    localStorage.setItem(AREA_KEY,JSON.stringify(local));
    try{await window.NovaStore?.remove("areas",key)}catch{}
    window.dispatchEvent(new CustomEvent("nova:areas-updated",{detail:{reason:"deleted",id:key,pendingCloudDelete:!!session&&!navigator.onLine}}));
  }
  function requireAccount(next){if(session)return true;location.href=accountHref()+"?next="+encodeURIComponent(next||location.pathname+location.search);return false}
  async function start(){if(!init()){window.dispatchEvent(new CustomEvent("nova:auth-ready",{detail:{session:null,profile:null,available:false}}));return}const {data}=await client.auth.getSession();session=data.session;if(session){profile=cachedProfile(session.user.id);if(profile){renderBadge();window.dispatchEvent(new CustomEvent("nova:auth-ready",{detail:{session,profile,cached:true}}))}try{await ensureProfile();renderBadge();window.dispatchEvent(new CustomEvent("nova:profile-updated",{detail:profile}));syncAreas().catch(e=>console.warn("Nexora area sync",e))}catch(e){console.warn("Nexora account sync",e)}}renderBadge();window.dispatchEvent(new CustomEvent("nova:auth-ready",{detail:{session,profile}}));client.auth.onAuthStateChange((_event,s)=>{session=s;setTimeout(async()=>{try{if(s){profile=cachedProfile(s.user.id);renderBadge();window.dispatchEvent(new CustomEvent("nova:auth-ready",{detail:{session,profile,cached:!!profile}}));await ensureProfile();syncAreas().catch(e=>console.warn("Nexora area sync",e))}else{profile=null;try{localStorage.removeItem(PROFILE_CACHE_KEY)}catch{}}}catch(e){console.warn("Nexora auth",e)}renderBadge();window.dispatchEvent(new CustomEvent("nova:auth-ready",{detail:{session,profile}}))},0)});}
  async function awardSeed(action,eventKey){if(!client||!session)throw new Error("not_authenticated");const {data,error}=await client.rpc("award_nexorawildfire_seed",{p_action:action,p_event_key:eventKey});if(error)throw error;return data} async function getSeedWallet(){if(!client||!session)return {points:0,history:[]};const {data,error}=await client.rpc("get_nexorawildfire_seed_wallet");if(error)throw error;return data||{points:0,history:[]}}
  window.NovaAuth={client:()=>client,session:()=>session,profile:()=>profile,displayName,signOut:()=>client?.auth.signOut(),saveProfile,syncAreas,saveArea,deleteArea,requireAccount,isLoggedIn:()=>!!session,awardSeed,getSeedWallet};
  // A sync attempt can fail while offline; retry once connectivity returns without discarding local copies.
  window.addEventListener("online",()=>{if(session)setTimeout(()=>syncAreas().catch(e=>console.warn("Nexora reconnect sync",e)),1200)});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
