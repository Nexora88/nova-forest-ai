(()=>{
const DAYS=[
 {m:1,d:1,k:'year',title:'Yeni yıl',text:'Yeni yılda daha güvenli ormanlar, verimli tarlalar ve sağlıklı ekosistemler için veriyle çalışmaya devam ediyoruz.',tone:'green',icon:'🌲'},
 {m:4,d:23,k:'national',title:'23 Nisan Ulusal Egemenlik ve Çocuk Bayramı',text:'Geleceğimiz olan çocuklara daha yeşil ve güvenli bir dünya bırakmak için çalışıyoruz.',tone:'red',icon:'🇹🇷'},
 {m:5,d:14,k:'agri',title:'Dünya Çiftçiler Günü',text:'Üreticinin emeğini; toprak, su ve iklim verilerini daha anlaşılır karar desteğine dönüştürerek destekliyoruz.',tone:'earth',icon:'🌾'},
 {m:5,d:19,k:'national',title:'19 Mayıs Atatürk\'ü Anma, Gençlik ve Spor Bayramı',text:'Bilim, üretim, gençlik ve çağdaşlık hedefiyle geleceğe bakıyoruz.',tone:'red',icon:'🇹🇷'},
 {m:6,d:5,k:'environment',title:'Dünya Çevre Günü',text:'Temiz hava, sağlıklı su, verimli toprak ve yaşayan ormanlar için çevresel veriyi eyleme dönüştürüyoruz.',tone:'green',icon:'🌿'},
 {m:8,d:30,k:'national',title:'30 Ağustos Zafer Bayramı',text:'Cumhuriyetimizin temelindeki bağımsızlık ve ortak gelecek anlayışını yaşatıyoruz.',tone:'red',icon:'🇹🇷'},
 {m:10,d:29,k:'national',title:'29 Ekim Cumhuriyet Bayramı',text:'Cumhuriyetimizin ışığında, vatan topraklarını ve ormanlarımızı koruyoruz.',tone:'red',icon:'🇹🇷'},
 {m:11,d:10,k:'memorial',title:'10 Kasım Atatürk\'ü Anma Günü',text:'Açtığın yolda, bilimsel ve çağdaş çevre anlayışının izindeyiz.',tone:'black',icon:'◼',image:'assets/ataturk-1925.jpg'},
 {m:3,d:21,k:'forest',title:'21 Mart Dünya Ormancılık Günü / Orman Haftası',text:'Ormanları yalnızca yangından değil; kuraklık, su stresi ve iklim baskısından da izlemek için çalışıyoruz.',tone:'forest',icon:'🌲'},
 {m:3,d:20,k:'bee',title:'Dünya Arıcılık Günü',text:'Arıcının emeği; orman, tarım ve biyoçeşitlilik arasındaki görünmez bağı taşır. Daha sağlıklı ekosistemler için birlikte izliyoruz.',tone:'earth',icon:'🐝'},
 {m:3,d:22,k:'water',title:'Dünya Su Günü',text:'Su; ormanın, tarlanın ve arılığın ortak yaşam kaynağıdır. Veriyi suyu korumak için kullanıyoruz.',tone:'green',icon:'💧'},
 {m:10,d:16,k:'food',title:'Dünya Gıda Günü',text:'Topraktan sofraya uzanan emeğin; güvenli, sürdürülebilir ve verimli bir geleceğe ulaşmasına katkı sunuyoruz.',tone:'earth',icon:'🌾'},
 {m:12,d:5,k:'soil',title:'Dünya Toprak Günü',text:'Sağlıklı toprak, sağlıklı tarım ve güçlü ekosistemlerin temelidir. Toprağı veriden başlayarak daha iyi anlamaya çalışıyoruz.',tone:'earth',icon:'🌱'},
 {m:12,d:11,k:'mountain',title:'Uluslararası Dağlar Günü',text:'Dağ ekosistemlerinin su, orman ve biyoçeşitlilik için taşıdığı değeri izliyoruz.',tone:'forest',icon:'⛰️'}
];
const root=location.pathname.includes('/pages/')?'../':'';
const esc=s=>String(s).replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
function today(){const n=new Date();return DAYS.find(x=>x.m===n.getMonth()+1&&x.d===n.getDate())}
function boot(){const day=today();if(!day)return;const key='nexora-special-day:'+new Date().getFullYear()+':'+day.m+'-'+day.d;if(sessionStorage.getItem(key))return;sessionStorage.setItem(key,'1');
 const banner=document.createElement('section');banner.className='nova-special-banner tone-'+day.tone;banner.innerHTML='<div class="special-icon">'+day.icon+'</div><div class="special-copy"><span>NOVA-ALERT / ÖZEL GÜN</span><strong>'+esc(day.title)+'</strong><p>'+esc(day.text)+'</p></div>'+(day.image?'<img src="'+root+day.image+'" alt="Atatürk, 1925">':'')+'<button class="special-close" aria-label="Bildirimi kapat">×</button>';
 document.body.prepend(banner);banner.querySelector('.special-close').onclick=()=>banner.remove();
 let center=document.querySelector('.nova-special-center');if(!center){center=document.createElement('aside');center.className='nova-special-center';center.innerHTML='<div class="special-center-head"><div><span>NOVA-ALERT</span><b>Özel Gün</b></div><button>×</button></div><div data-special-body></div>';document.body.appendChild(center);center.querySelector('button').onclick=()=>center.classList.remove('show')}
 center.querySelector('[data-special-body]').innerHTML='<div class="special-center-icon">'+day.icon+'</div><small>'+String(day.d).padStart(2,'0')+'.'+String(day.m).padStart(2,'0')+'</small><h3>'+esc(day.title)+'</h3><p>'+esc(day.text)+'</p>'+(day.image?'<img src="'+root+day.image+'" alt="Atatürk, 1925">':'');center.classList.add('show');
 try{window.NovaStore?.put('alerts',{id:'special:'+key,title:day.title,message:day.text,severity:'info',source:'Nova-Alert / Özel Gün',createdAt:Date.now(),read:false})}catch{}
 }
 window.NexoraSpecialDays={days:DAYS,today};document.addEventListener('DOMContentLoaded',boot);
})();