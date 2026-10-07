(()=>{
const ACTIVE=["Edirne","Tekirdağ","Kırklareli","Çanakkale","İstanbul"];
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("tr-TR").replaceAll("ı","i");
const key=city=>"nexora-wildfire-vote:"+norm(city);
const count=city=>Number(localStorage.getItem(key(city))||0);
function panel(){
 if(document.querySelector(".nexora-support-panel"))return document.querySelector(".nexora-support-panel");
 const p=document.createElement("div");p.className="nexora-support-panel";
 p.innerHTML='<button class="support-fab" aria-label="Destek ve geri bildirim">?</button><div class="support-card"><div class="eyebrow">NEXORA / GERİ BİLDİRİM</div><h3>İstediğin ili söyle.</h3><p>Yeni il, veri hatası veya özellik önerini gönder. Haritada olmayan bir ili seçip destekleyebilirsin.</p><select data-city>'+ACTIVE.map(x=>'<option>'+x+'</option>').join("")+ '<option value="other">Diğer il</option></select><textarea data-msg rows="3" placeholder="Mesajın..."></textarea><div class="support-actions"><button data-send>Gönder</button><button data-close>Kapat</button></div><span class="support-issues">Yerel olarak kaydedilir</span></div>';
 document.body.appendChild(p);p.querySelector(".support-fab").onclick=()=>p.classList.toggle("open");p.querySelector("[data-close]").onclick=()=>p.classList.remove("open");p.querySelector("[data-send]").onclick=()=>{const city=p.querySelector("[data-city]").value,msg=p.querySelector("[data-msg]").value.trim();if(!msg)return;const rows=JSON.parse(localStorage.getItem("nexora-feedback-v1")||"[]");rows.push({city,message:msg,createdAt:new Date().toISOString()});localStorage.setItem("nexora-feedback-v1",JSON.stringify(rows));p.querySelector("[data-msg]").value="";p.classList.remove("open");window.NovaProduct?.toast?.("NexoraWildfire","Geri bildirimin bu cihazda kaydedildi.","success")};return p;
}
function comingSoon(city){
 let old=document.querySelector(".province-coming-soon");if(old)old.remove();const voted=localStorage.getItem(key(city)+":voted")==="1";const b=document.createElement("div");b.className="province-coming-soon";
 b.innerHTML='<div class="coming-kicker">NEXORAWILDFIRE / KAPSAM</div><button class="coming-close">×</button><h3>'+city+'</h3><p>Bu il şu anda canlı analiz kapsamının dışında. <strong>Yakında gelecek.</strong></p><p class="coming-note">Bu ilin önceliklendirilmesini istiyorsan oyunu bırak.</p><div class="vote-row"><strong data-count>'+count(city)+'</strong><span>bu tarayıcıda kaydedilen istek oyu</span></div><button class="vote-button" data-vote '+(voted?"disabled":"")+'>'+(voted?"✓ İstek gönderildi":"Bu ili istiyoruz")+'</button><div class="coming-links"><button data-support>Destek / Geri Bildirim</button></div><small>Sayılar yapay olarak artırılmaz: bu sayaç yalnızca bu cihazdaki gerçek kullanıcı oylarını gösterir. Global toplam değildir.</small>';
 document.querySelector(".map-section")?.appendChild(b);b.querySelector(".coming-close").onclick=()=>b.remove();b.querySelector("[data-vote]").onclick=()=>{if(localStorage.getItem(key(city)+":voted")==="1")return;const n=count(city)+1;localStorage.setItem(key(city),String(n));localStorage.setItem(key(city)+":voted","1");b.querySelector("[data-count]").textContent=n;b.querySelector("[data-vote]").disabled=true;b.querySelector("[data-vote]").textContent="✓ İstek gönderildi"};b.querySelector("[data-support]").onclick=()=>{const p=panel();p.classList.add("open");p.querySelector("[data-city]").value=city};
}
window.NexoraFeedback={comingSoon,panel};panel();
})();
