# Kurumsal rapor iş akışı — jüri diyagramı

Bu diyagram, repoya eklenen FastAPI worker API + Celery/Redis kuyruk tüketicisi + PDF üretimi + Supabase Storage signed URL + Resend e-posta akışını gösterir. Kodun repoda olması canlı dağıtımın yapıldığını göstermez; servisleri ayrı ayrı dağıtıp gerçek kimlik bilgileriyle kabul testinden geçirmek gerekir.

```mermaid
flowchart TD
    A[Şirket kullanıcısı: Detaylı Rapor İndir] --> B[FastAPI: Supabase JWT doğrulama]
    B --> C{Kurumsal yetki var mı?}
    C -- Hayır --> D[403: erişim gerekli]
    C -- Evet --> E[İstek doğrulama + idempotency key]
    E --> F[İş kuyruğuna ekle]
    F --> G[202 Accepted: job_id + hazırlanıyor]
    G --> H[UI durum sorgulama / bildirim aboneliği]
    F --> I[Worker job alır]
    I --> J[NASA FIRMS + hava + Sentinel-2 sağlayıcılarını sorgula]
    J --> K[Kaynak ve zaman damgalarını doğrula; eksikleri açıkça işaretle]
    K --> L[GIS analizleri + PDF üretimi]
    L --> M[PDF'i özel Supabase Storage bucket'a yükle]
    M --> N[İmzalı, süreli indirme URL'si oluştur]
    N --> O[İş sahibine e-posta gönder]
    O --> P[Job durumunu completed yap]
    I --> Q{Hata / zaman aşımı?}
    Q -- Evet --> R[Retry/backoff; limit aşılırsa failed]
    R --> S[Hata durumunu kaydet + kullanıcıya bildir]
    H --> T[GET job status]
    T --> P
    T --> S
```

## Dağıtım kontrol listesi

- [ ] `NEXORA_WORKER_URL` ve yalnız sunucuda tutulan `NEXORA_WORKER_TOKEN`.
- [x] Repo içinde Celery + Redis kuyruk iskeleti ve worker API eklendi; Redis'in kalıcı/erişilebilir yapılandırması dağıtımda doğrulanmalı.
- [ ] Job tablosunda queued/running/completed/failed, progress, retry_count ve zaman damgaları.
- [ ] Her durum/indirme isteğinde işin sahibini doğrula; Storage bucket'ı private tut.
- [x] Kodda 7 günlük signed URL üretiliyor; bucket'ın private olduğuna ve URL erişiminin doğru çalıştığına dağıtımda bakılmalı.
- [ ] İdempotency ve tekrar deneme; çift PDF/e-posta üretimini engelle.
- [x] Resend e-posta gönderimi eklendi; doğrulanmış gönderen, rate limit ve teslimat logları dağıtımda ayarlanmalı.
- [ ] Şirket varlığı koordinatlarını loglara ve herkese açık artefaktlara yazma.
- [ ] Sağlayıcılar hata verirse rapor "veri yok/sağlayıcı hatası" yazsın; uydurma değer ekleme.
- [ ] 60–120 saniye hedefini ölçümle doğrula; garanti gibi sunma.
