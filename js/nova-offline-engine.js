/* NexoraWildfire EDGE local decision engine. Heuristics are decision-support, not certified forecasts. */
(function(){
  function risk(w){
    w=w||{};let s=0;
    if(w.t>=40)s+=30;else if(w.t>=30)s+=15;else if(w.t>=25)s+=7;
    if(w.h<=20)s+=25;else if(w.h<=40)s+=10;else if(w.h<=55)s+=4;
    if(w.wind>=40)s+=25;else if(w.wind>=20)s+=10;else if(w.wind>=12)s+=4;
    if(Number(w.soil)<.18)s+=10; return Math.min(100,s);
  }
  function evaluate(w,previous){
    const r=risk(w), alerts=[];
    if(Number(w.soil)<.15)alerts.push({level:"critical",title:"SU STRESİ",message:"Yerel veride toprak nemi kritik eşikte."});
    else if(Number(w.soil)<.20)alerts.push({level:"warning",title:"NEM DÜŞÜYOR",message:"Yerel veride toprak nemi düşük."});
    if(Number(w.vpd)>2)alerts.push({level:"warning",title:"VPD YÜKSEK",message:"Hava koşulları su kaybı baskısını artırıyor."});
    if(Number(w.wind)>25)alerts.push({level:"warning",title:"RÜZGAR",message:"Yerel veride yüksek rüzgar görülüyor."});
    if(previous && r-previous.risk>=15)alerts.push({level:"warning",title:"RİSK ARTIŞI",message:"Son kayıtla karşılaştırıldığında risk belirgin arttı."});
    return {risk:r,alerts,calculatedAt:Date.now(),mode:"offline-decision-support"};
  }
  window.NovaOfflineEngine={risk,evaluate};
})();