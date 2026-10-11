# Third-party licenses and notices / Üçüncü Taraf Lisansları ve Bildirimleri

This notice is a project-maintained inventory, not legal advice. Verify each upstream license and provider terms before redistributing, offering a hosted service, or publishing derived datasets. / Bu belge proje tarafından tutulan bir envanterdir, hukuki danışmanlık değildir. Yeniden dağıtım, barındırılan hizmet sunumu veya türetilmiş veri yayımlama öncesinde her kaynağın güncel lisansını ve sağlayıcı koşullarını doğrulayın.

## English

### Project code

The root `LICENSE` is MIT and applies to Nexora-authored source code covered by that license. It does not automatically cover external libraries, pretrained weights, datasets, satellite imagery, map tiles, trademarks, or provider services.

### Known third-party components and data

| Component | Role | License / terms status |
|---|---|---|
| Python and JavaScript dependencies | Runtime and UI | Each package keeps its own license. Review dependency metadata and upstream notices before release. |
| Ultralytics YOLO | Object-detection runtime | The current community package is distributed under AGPL-3.0 terms unless a different commercial license applies. Review the current upstream license and network/service implications before distributing or hosting it. |
| `rabahdev/fire-smoke-yolov8n` / `best.pt` | Third-party fire/smoke checkpoint downloaded at runtime | Upstream documentation has indicated AGPL-3.0. Verify the current model card, exact weight license, training-data terms, and attribution requirements at the time of use. No checkpoint is bundled in this repository. |
| UCI Algerian Forest Fires dataset | Research-only Random Forest experiment | CC BY 4.0 as recorded in the dataset/model metadata; cite the UCI repository and DOI [10.24432/C5KW4N](https://doi.org/10.24432/C5KW4N). |
| NASA FIRMS | Thermal-anomaly observations / proxy labels | Check the specific product, documentation, attribution, and data-use terms. A hotspot is not a confirmed incident. Do not commit API keys or restricted exports. |
| Open-Meteo | Weather and air-quality API | The public API terms describe free access for open-source/non-commercial use, ask users to contact Open-Meteo for commercial use, and license API data under CC BY 4.0 with attribution (for example, 'Weather data by Open-Meteo.com'). Re-check current terms and rate limits before launch. |
| Copernicus / Sentinel-2 | Satellite-scene and vegetation-index workflows | Follow the relevant Copernicus Data Space, Sentinel product, processing, and attribution terms. A scene search is not itself a calculated NDVI/NDMI observation. |
| OpenStreetMap | Base map tiles and geographic data | Preserve required attribution; public tile servers have usage policies. Do not assume unlimited production tile use. |
| Esri, CARTO, OpenTopoMap and HOT tiles | Optional alternate basemaps | Each provider has its own attribution, acceptable-use, and licensing terms. Keep attribution visible and verify the terms before commercial use. |
| Leaflet and related plugins | Browser mapping | Review the individual package license and retain required notices. |

### Current release gate

The repository's root code license is MIT while the optional YOLOv8 runtime uses the Ultralytics AGPL-3.0 ecosystem. Do **not** assume these licenses are automatically compatible. Before merging this integration into a release or operating the public model service, choose and document a compliant path: obtain a suitable license, license the covered combined work under compatible terms, or replace/isolate the AGPL component after qualified legal review. Until that decision is made, the YOLO service is a research integration, not a cleared commercial deployment.

### Distribution checklist

- [ ] Review the exact licenses of dependencies in the release environment.
- [ ] Verify the YOLO checkpoint's current upstream license and the Ultralytics license path selected for the deployment.
- [ ] Confirm whether AGPL obligations are compatible with the intended source distribution and hosted-service model; obtain qualified legal review if needed.
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
| Ultralytics YOLO | Nesne algılama çalışma zamanı | Güncel topluluk paketi, farklı bir ticari lisans kullanılmadıkça AGPL-3.0 koşullarıyla dağıtılır. Dağıtım veya barındırma öncesinde güncel lisansı ve ağ hizmetine ilişkin sonuçları inceleyin. |
| `rabahdev/fire-smoke-yolov8n` / `best.pt` | Çalışma zamanında indirilen üçüncü taraf yangın/duman modeli | Kaynak dokümantasyonu AGPL-3.0 lisansına işaret etmiştir. Kullanım sırasında güncel model kartını, ağırlıkların tam lisansını, eğitim verisi koşullarını ve atıf gerekliliklerini doğrulayın. Bu depo model ağırlığını içermez. |
| UCI Cezayir Orman Yangınları veri kümesi | Araştırma amaçlı Random Forest deneyi | Veri kümesi/model metaverisinde CC BY 4.0 olarak kayıtlıdır; UCI kaynağına ve [10.24432/C5KW4N](https://doi.org/10.24432/C5KW4N) DOI'sine atıf yapın. |
| NASA FIRMS | Termal anomali gözlemleri / vekil etiketler | Kullanılan ürünün belgelerini, atıf ve veri kullanım koşullarını kontrol edin. Sıcak nokta, doğrulanmış yangın kaydı değildir. API anahtarlarını veya kısıtlı dışa aktarımları depoya koymayın. |
| Open-Meteo | Hava ve hava kalitesi API'si | Kamuya açık API koşulları açık kaynak/ticari olmayan kullanım için ücretsiz erişim belirtir; ticari kullanım için Open-Meteo ile iletişime geçilmesini ister. API verisi atıf şartıyla CC BY 4.0 lisansındadır (ör. 'Weather data by Open-Meteo.com'). Yayın öncesinde güncel koşulları ve hız sınırlarını yeniden kontrol edin. |
| Copernicus / Sentinel-2 | Uydu sahnesi ve bitki indeksi iş akışları | İlgili Copernicus Data Space, Sentinel ürün, işleme ve atıf koşullarına uyun. Sahne araması tek başına hesaplanmış NDVI/NDMI gözlemi değildir. |
| OpenStreetMap | Temel harita döşemeleri ve coğrafi veri | Gerekli atıfları koruyun; herkese açık döşeme sunucularının kullanım politikaları vardır. Üretim için sınırsız kullanım varsaymayın. |
| Esri, CARTO, OpenTopoMap ve HOT döşemeleri | İsteğe bağlı alternatif haritalar | Her sağlayıcının ayrı atıf, kabul edilebilir kullanım ve lisans koşulları vardır. Atıfları görünür tutun ve ticari kullanım öncesi koşulları doğrulayın. |
| Leaflet ve ilgili eklentiler | Tarayıcı haritalama | Her paketin lisansını ayrı inceleyin ve gerekli bildirimleri koruyun. |

### Dağıtım kontrol listesi

- [ ] Yayın ortamındaki bağımlılıkların tam lisanslarını inceleyin.
- [ ] YOLO ağırlıklarının güncel lisansını ve dağıtım için seçilen Ultralytics lisans yolunu doğrulayın.
- [ ] AGPL yükümlülüklerinin amaçlanan kaynak kodu dağıtımı ve barındırılan hizmet modeliyle uyumunu değerlendirin; gerekirse nitelikli hukuki inceleme alın.
- [ ] Veri sağlayıcı atıflarını koruyun; yeniden dağıtım izni olmayan verileri paketlemeyin.
- [ ] API anahtarlarını, erişim belirteçlerini ve özel kullanıcı verilerini Git geçmişinden ve herkese açık hata bildirimlerinden uzak tutun.
- [ ] Model ağırlıkları, harita sağlayıcıları veya veri kümeleri değiştiğinde lisansları yeniden kontrol edin.
