# Third-party licenses and notices / Üçüncü Taraf Lisansları ve Bildirimleri

This notice is a project-maintained inventory, not legal advice. Verify each upstream license and provider terms before redistributing, offering a hosted service, or publishing derived datasets. / Bu belge proje tarafından tutulan bir envanterdir, hukuki danışmanlık değildir. Yeniden dağıtım, barındırılan hizmet sunumu veya türetilmiş veri yayımlama öncesinde her kaynağın güncel lisansını ve sağlayıcı koşullarını doğrulayın.

## English

### Project code

The root `LICENSE` is MIT and applies to Nexora-authored source code covered by that license. It does not automatically cover external libraries, pretrained weights, datasets, satellite imagery, map tiles, trademarks, or provider services.

### Known third-party components and data

| Component | Role | License / terms status |
|---|---|---|
| Python and JavaScript dependencies | Runtime and UI | Each package keeps its own license. Review dependency metadata and upstream notices before release. |
| Fire/smoke inference | Experimental image analysis | Disabled. The AGPL-3.0 Ultralytics runtime and third-party checkpoint have been removed from the active integration. A future model must be separately license-reviewed before use. |
| UCI Algerian Forest Fires dataset | Research-only Random Forest experiment | CC BY 4.0 as recorded in the dataset/model metadata; cite the UCI repository and DOI [10.24432/C5KW4N](https://doi.org/10.24432/C5KW4N). |
| NASA FIRMS | Thermal-anomaly observations / proxy labels | Check the specific product, documentation, attribution, and data-use terms. A hotspot is not a confirmed incident. Do not commit API keys or restricted exports. |
| Open-Meteo | Weather and air-quality API | The public API terms describe free access for open-source/non-commercial use, ask users to contact Open-Meteo for commercial use, and license API data under CC BY 4.0 with attribution (for example, 'Weather data by Open-Meteo.com'). Re-check current terms and rate limits before launch. |
| Copernicus / Sentinel-2 | Satellite-scene and vegetation-index workflows | Follow the relevant Copernicus Data Space, Sentinel product, processing, and attribution terms. A scene search is not itself a calculated NDVI/NDMI observation. |
| OpenStreetMap | Base map tiles and geographic data | Preserve required attribution; public tile servers have usage policies. Do not assume unlimited production tile use. |
| Esri, CARTO, OpenTopoMap and HOT tiles | Optional alternate basemaps | Each provider has its own attribution, acceptable-use, and licensing terms. Keep attribution visible and verify the terms before commercial use. |
| Leaflet and related plugins | Browser mapping | Review the individual package license and retain required notices. |

### Current release gate

The project keeps its root MIT license. The AGPL-3.0 Ultralytics runtime and third-party fire/smoke checkpoint have been removed from the active integration. Fire/smoke inference is intentionally disabled; the status endpoint reports this clearly and the detection endpoint fails closed. This does not constitute legal advice or a guarantee that every other dependency is MIT-licensed. Continue reviewing all dependency, data, and provider terms before distribution or commercial use.

### Distribution checklist

- [ ] Review the exact licenses of dependencies in the release environment.
- [ ] Verify any future model runtime, weights, and training dataset licenses before enabling inference.
- [ ] Preserve data-provider attribution and avoid bundling data that is not permitted to be redistributed.
- [ ] Keep API keys, tokens, and private user data out of Git history and public issue reports.
- [ ] Recheck licenses when replacing model weights, map providers, or datasets.

## Türkçe

### Proje kodu

Kök dizindeki `LICENSE`, ilgili lisans kapsamındaki Nexora kaynak kodu için MIT lisansıdır. Haricî kütüphaneleri, önceden eğitilmiş model ağırlıklarını, veri kümelerini, uydu görüntülerini, harita döşemelerini, ticari markaları veya sağlayıcı hizmetlerini kendiliğinden kapsamaz.

### Bilinen üçüncü taraf bileşenleri ve veriler

| Bileşen | Kullanım | Lisans / koşul durumu |
|---|---|---|
| Python ve JavaScript bağımlılıkları | Çalışma zamanı ve arayüz | Her paket kendi lisansını korur. Yayın öncesinde bağımlılık metaverisini ve kaynak bildirimlerini inceleyin. |
| Yangın/duman çıkarımı | Deneysel görüntü analizi | Devre dışı. AGPL-3.0 lisanslı Ultralytics çalışma zamanı ve üçüncü taraf model ağırlıkları etkin entegrasyondan kaldırılmıştır. Gelecekte kullanılacak model önceden ayrıca lisans incelemesinden geçirilmelidir. |
| UCI Cezayir Orman Yangınları veri kümesi | Araştırma amaçlı Random Forest deneyi | Veri kümesi/model metaverisinde CC BY 4.0 olarak kayıtlıdır; UCI kaynağına ve [10.24432/C5KW4N](https://doi.org/10.24432/C5KW4N) DOI'sine atıf yapın. |
| NASA FIRMS | Termal anomali gözlemleri / vekil etiketler | Kullanılan ürünün belgelerini, atıf ve veri kullanım koşullarını kontrol edin. Sıcak nokta, doğrulanmış yangın kaydı değildir. API anahtarlarını veya kısıtlı dışa aktarımları depoya koymayın. |
| Open-Meteo | Hava ve hava kalitesi API'si | Kamuya açık API koşulları açık kaynak/ticari olmayan kullanım için ücretsiz erişim belirtir; ticari kullanım için Open-Meteo ile iletişime geçilmesini ister. API verisi atıf şartıyla CC BY 4.0 lisansındadır (ör. 'Weather data by Open-Meteo.com'). Yayın öncesinde güncel koşulları ve hız sınırlarını yeniden kontrol edin. |
| Copernicus / Sentinel-2 | Uydu sahnesi ve bitki indeksi iş akışları | İlgili Copernicus Data Space, Sentinel ürün, işleme ve atıf koşullarına uyun. Sahne araması tek başına hesaplanmış NDVI/NDMI gözlemi değildir. |
| OpenStreetMap | Temel harita döşemeleri ve coğrafi veri | Gerekli atıfları koruyun; herkese açık döşeme sunucularının kullanım politikaları vardır. Üretim için sınırsız kullanım varsaymayın. |
| Esri, CARTO, OpenTopoMap ve HOT döşemeleri | İsteğe bağlı alternatif haritalar | Her sağlayıcının ayrı atıf, kabul edilebilir kullanım ve lisans koşulları vardır. Atıfları görünür tutun ve ticari kullanım öncesi koşulları doğrulayın. |
| Leaflet ve ilgili eklentiler | Tarayıcı haritalama | Her paketin lisansını ayrı inceleyin ve gerekli bildirimleri koruyun. |

### Dağıtım kontrol listesi

- [ ] Yayın ortamındaki bağımlılıkların tam lisanslarını inceleyin.
- [ ] Gelecekte çıkarım etkinleştirilmeden önce model çalışma zamanı, ağırlıklar ve eğitim veri kümesinin lisanslarını doğrulayın.
- [ ] Veri sağlayıcı atıflarını koruyun; yeniden dağıtım izni olmayan verileri paketlemeyin.
- [ ] API anahtarlarını, erişim belirteçlerini ve özel kullanıcı verilerini Git geçmişinden ve herkese açık hata bildirimlerinden uzak tutun.
- [ ] Model ağırlıkları, harita sağlayıcıları veya veri kümeleri değiştiğinde lisansları yeniden kontrol edin.
