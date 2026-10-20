# Trakya saha pilotu / Thrace field pilot

## Amaç
NexoraWildfire AI, Trakya için Open-Meteo hava koşullarını ve NASA FIRMS termal anomali gözlemlerini tek bir karar destek ekranında bir araya getiren erken aşama bir prototiptir. Resmî uyarı sistemi veya doğrulanmış yangın tahmini olarak sunulmaz.

## Pilot daveti (Türkçe)
**Konu:** Trakya için çevresel izleme prototipi — kısa kullanıcı geri bildirimi talebi

Merhaba,

Trakya bölgesindeki tarım, orman ve arıcılık faaliyetlerini etkileyebilecek hava koşulları ile uydu kaynaklı sıcak nokta gözlemlerini tek ekranda birleştiren NexoraWildfire AI adlı erken aşama bir prototip geliştiriyorum.

Uygulama şu anda Open-Meteo meteorolojik verilerini ve yapılandırılmış olması halinde NASA FIRMS sıcak nokta verilerini gösteriyor. Bu aşamada sistem resmî yangın uyarısı veya doğrulanmış yangın tahmini değildir; amacım gerçek kullanıcıların hangi göstergeleri faydalı bulduğunu ve hangi hataların/eksiklerin giderilmesi gerektiğini öğrenmek.

Uygun görürseniz, 15–20 dakikalık kısa bir tanıtım ve geri bildirim görüşmesi yapabilir miyiz? Görüşme herhangi bir satın alma veya iş birliği taahhüdü gerektirmez. İzin verilmeden kurum adınızı referans, logo veya onay olarak kullanmayacağım.

Zaman ayırdığınız için teşekkür ederim.

Saygılarımla,  
NexoraWildfire AI proje ekibi

## Pilot görüşmesinde sorulacaklar
- Hangi bölge ve zaman ölçeği sizin için anlamlı?
- Hangi veri yanlış alarm yaratır veya güven kaybına neden olur?
- Sıcak nokta gözlemlerini sahada nasıl teyit ediyorsunuz?
- Uyarının hangi kanaldan ve hangi sıklıkta gelmesi yararlı olur?
- Deneme sırasında hangi başarı ve hata ölçütleri izlenmeli?

## Güvenli pilot ilkeleri
- Kurumdan açık izin alınmadan isim, logo veya kullanıcı verisi yayımlamayın.
- Kişisel konum ve hassas arılık/tarla koordinatlarını açık paylaşmayın.
- Sistem çıktılarını resmî kurum uyarılarının yerine koymayın.
- FIRMS termal anomalilerini doğrulanmış yangın olarak etiketlemeyin.


## Gerçek kullanıcı geri bildirimi toplama süreci

Bu belge bir davet taslağıdır; herhangi bir kooperatif, kurum veya üreticiyle görüşme yapıldığını göstermez.

1. **Katılımcı bulma:** Trakya'daki çiftçi, arıcı, orman çalışanı ve araştırmacılara yalnızca uygun, izinli kanallardan bireysel davet gönder. Kurum adı/logo/ortaklık iddiası için ayrıca yazılı izin gerekir.
2. **Durumu kaydetme:** Her daveti yalnızca gerçekten gerçekleşen aşamayla işaretle: planlandı → gönderildi → yanıtlandı → görüşme için onay verdi → görüşme yapıldı. Yanıt gelmemesini katılım veya onay olarak sayma.
3. **Gönüllü görüşme:** 15–20 dakikalık görüşme için önce amaç, gönüllülük, kayıt alınıp alınmayacağı ve verinin nasıl kullanılacağını açıkla. Ses/görüntü kaydı varsayılan olarak alma; gerekirse ayrıca açık izin iste.
4. **Yapılandırılmış geri bildirim:** Uygulamadaki Geri Bildirim formunda katılımcı rolü, genel bölge, sorun türü, kullanım senaryosu, görülen/beklenen davranış ve fayda puanını topla. Ad, iletişim bilgisi ve kesin tarla/arılık koordinatı isteme.
5. **İnceleme:** Her bildirimi **yeni**, **inceleniyor**, **düzeltildi**, **tekrar test edildi** veya **kapatıldı** durumuyla izle. Hata raporlarında yeniden üretim adımı ve veri kaynağı/zamanı varsa ekle; kişisel/hassas verileri çıkar.
6. **Başarı ölçütleri:** Katılımcı sayısı ve roller, tamamlanan görüşmeler, tekrarlanan sorunlar, yanlış alarm/kaçırılmış olay örnekleri, mobil kullanım engelleri ve düzeltmelerden sonra yeniden test sonuçlarını raporla. Örneklem küçükse genelleme yapma.
7. **Şeffaf raporlama:** Yalnızca gerçekten toplanan ve izin verilen sonuçları yayımla. Hiç görüşme yapılmadıysa bunu açıkça söyle; boş şablonları veya davetleri saha doğrulaması olarak sunma.

Geri Bildirim sayfasındaki form, yapılandırılmış yanıtları yalnızca sunucu ve özel Supabase tablosu yapılandırıldığında alır. Sunucu yapılandırması eksikse form bunu açıkça bildirir; yerel cihazda kaydetmiş gibi başarı göstermez.
