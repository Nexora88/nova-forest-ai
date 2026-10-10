/* Separate Leaflet drawing map for company-owned infrastructure geometries. */
(function(){
 const host=document.getElementById("enterprise-asset-map");if(!host)return;
 const note=document.querySelector("[data-draw-status]");const say=t=>{if(note)note.textContent=t};
 if(!window.L||!L.Control?.Draw){say("Harita çizim aracı yüklenemedi. GeoJSON dosyası yükleyerek devam edebilirsin.");return}
 const map=L.map(host,{preferCanvas:true}).setView([41.15,26.6],7);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"© OpenStreetMap"}).addTo(map);
 const drawn=new L.FeatureGroup();map.addLayer(drawn);
 map.addControl(new L.Control.Draw({draw:{polyline:{shapeOptions:{color:"#00b84f",weight:4}},polygon:{allowIntersection:false,shapeOptions:{color:"#00b84f"}},rectangle:false,circle:false,circlemarker:false,marker:{}},edit:{featureGroup:drawn,remove:true}}));
 function refresh(){const features=drawn.toGeoJSON().features;window.NexoraEnterpriseDraw={geojson:features.length?{type:"FeatureCollection",features}:null};say(features.length+" varlık geometrisi seçildi. "+(features.length?"PDF formunu göndererek analizi kuyruğa alabilirsin.":"Çizim ekleyebilir veya dosya yükleyebilirsin."))}
 map.on(L.Draw.Event.CREATED,e=>{drawn.clearLayers();drawn.addLayer(e.layer);refresh()});
 map.on(L.Draw.Event.EDITED,refresh);map.on(L.Draw.Event.DELETED,refresh);
 window.NexoraEnterpriseDraw={geojson:null};
})();
