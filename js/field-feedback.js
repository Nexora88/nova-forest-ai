(()=> {
  const form=document.getElementById("field-feedback-form");
  if(!form)return;
  const status=document.getElementById("field-feedback-status");
  const API=(window.NOVA_API_BASE||(location.hostname.endsWith("github.io")?"https://nova-forest-ai.vercel.app/api":"/api")).replace(/\/$/,"");
  fetch(API+"/feedback/status").then(r=>r.ok?r.json():null).then(data=>{
    if(!data)return;
    if(status)status.textContent=data.submission_enabled?"Sunucu form gönderimini kabul etmeye hazır. Gerçek saha görüşmeleri ayrıca planlanmalı.":"Form sunucusu henüz yapılandırılmadı; gönderimler şu an alınamıyor.";
    const submit=form.querySelector('[type="submit"]');
    if(submit)submit.disabled=!data.submission_enabled;
  }).catch(()=>{if(status)status.textContent="Gönderim sunucusuna ulaşılamadı; daha sonra tekrar dene."});
  form.addEventListener("submit",async event=>{
    event.preventDefault();
    const submit=form.querySelector('[type="submit"]');
    if(submit)submit.disabled=true;
    if(status)status.textContent="Geri bildirim gönderiliyor…";
    const data=Object.fromEntries(new FormData(form).entries());
    data.usefulness=Number(data.usefulness);
    data.privacy_acknowledged=form.elements.privacy_acknowledged.checked;
    try{
      const response=await fetch(API+"/feedback/submit",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(data)});
      let body={};try{body=await response.json()}catch{}
      if(!response.ok)throw new Error(body.detail||"Geri bildirim kaydedilemedi.");
      if(status)status.textContent=body.message||"Geri bildirimin alındı.";
      form.reset();
    }catch(error){if(status)status.textContent=error.message||"Gönderim başarısız. Bağlantını kontrol edip tekrar dene."}
    finally{if(submit)submit.disabled=false}
  });
})();