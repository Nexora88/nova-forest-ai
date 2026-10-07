# NexoraWildfire

NexoraWildfire, Nexora catisi altinda gelistirilen Turkiye geneli cevresel risk ve yangin karar destek uygulamasidir.

## Kapsam

- 81 il ve 973 ilce icin offline vector idari sinir altyapisi
- Orman, yangin, tarim, su/toprak ve polen katmanlari
- Uydu gorunumu ve analiz tarama arayuzu
- Il -> ilce -> koy/mahalle -> alan hiyerarsisi
- Kisisel tarla, arilik ve orman alanlarini kaydetme
- PWA olarak bilgisayar ve telefona kurulabilme
- Offline-first servis worker + IndexedDB yerel veri deposu
- Open-Meteo, OpenStreetMap/Nominatim, Copernicus Sentinel-2 ve yapilandirildiginda NASA FIRMS veri altyapisi

## Uygulamayi yukleme

Uygulama PWA olarak calisir. Desteklenen tarayicilarda ana ekrandaki Cihaza yukle butonu kullanilabilir. Tarayici bu secenegi gostermiyorsa tarayicinin uygulama/yukleme menusunden NexoraWildfire kurulabilir.

## Harita

Harita renkleri secilen veri katmanina gore degisir. Uydu katmaninda vector sinirlar ve analiz tarama efekti birlikte goruntulenir. Ilce sinirlari yerel data/admin/tur_admin2.geojson dosyasindan yuklenir; temel idari harita internet olmadan da acilabilir.

## Veri ve karar destegi

NexoraWildfire kesin yangin tahmini veya resmi afet uyarisi iddiasinda bulunmaz. Sistem mevcut verileri birlestirerek risk ve cevresel karar destek sinyalleri uretir. Canli veri yoksa son gecerli yerel veri acikca cevrimdisi olarak gosterilir.

## Teknoloji

- PWA
- Leaflet
- IndexedDB
- Service Worker
- GeoJSON
- FastAPI backend

## Gelistirici

Ahmet Eymen Bakrac
Nexora / Nexora88
2026
