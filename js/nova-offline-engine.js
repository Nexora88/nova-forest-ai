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
    if(Number(w.soil)<.15)alerts.push({level:"critical",title:"SU STRESÄ°",message:"Yerel veride toprak nemi kritik eÅŸikte."});
    else if(Number(w.soil)<.20)alerts.push({level:"warning",title:"NEM DÃœÅÃœYOR",message:"Yerel veride toprak nemi dÃ¼ÅŸÃ¼k."});
    if(Number(w.vpd)>2)alerts.push({level:"warning",title:"VPD YÃœKSEK",message:"Hava koÅŸullarÄ± su kaybÄ± baskÄ±sÄ±nÄ± artÄ±rÄ±yor."});
    if(Number(w.wind)>25)alerts.push({level:"warning",title:"RÃœZGAR",message:"Yerel veride yÃ¼ksek rÃ¼zgar gÃ¶rÃ¼lÃ¼yor."});
    if(previous && r-previous.risk>=15)alerts.push({level:"warning",title:"RÄ°SK ARTIÅI",message:"Son kayÄ±tla karÅŸÄ±laÅŸtÄ±rÄ±ldÄ±ÄŸÄ±nda risk belirgin arttÄ±."});
    return {risk:r,alerts,calculatedAt:Date.now(),mode:"offline-decision-support"};
  }
  window.NovaOfflineEngine={risk,evaluate};
})();
