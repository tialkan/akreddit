# AVESİS sistem haritası

Kaynak: AYBÜ AVESİS panelinin salt okunur incelemesi, 26 Eylül 2026. AVESİS, Abis Teknoloji ürünüdür. Yedi üniversitenin (AYBÜ, Hacettepe, Ankara, Gazi, Yıldız, Dokuz Eylül, Erciyes) herkese açık sayfaları aynı yapıda. İç panelde üniversitenin açtığı modüller farklı olabilir. **Her zaman önce sayfayı oku, bu haritayı yol gösterici say.** Farklılık görürsen `akreddit adim sistem_farki --ayrinti '<json>'` ile kaydet.

## Giriş

Kurumun ortak giriş sayfasına yönlenir (AYBÜ'de ABİS "Ortak Giriş", reCAPTCHA var). Girişi ve robot doğrulamasını kullanıcı yapar.

## Akreditasyon için değerli sayfalar

Tüm adresler `https://avesis.<kurum>.edu.tr` altında.

| Sayfa | Adres | Akreditasyondaki kullanımı |
|---|---|---|
| Verdiği Dersler | `/researcher/lesson` | Ders listesi, dönem, saat, AKTS, öğrenci sayısı |
| Ders düzenleme | `/researcher/lesson/edit/<id>` | Tek dersin ayrıntısı (aşağıda) |
| Program İyileştirme Faaliyetleri | `/researcher/courseandprogramimprovement` | İyileştirme döngüsünün kanıtı |
| Tasarlanan Dersler | `/researcher/designedlesson` | Müfredat tasarımı katkısı |
| Tasarlanan Programlar | `/researcher/programmedevelopment` | Program tasarımı |
| Öğrenci Projeleri | `/researcher/studentproject` | Uygulamalı eğitim kanıtı |
| Öğrenci ve Kulüp Danışmanlıkları | `/researcher/mentorship` | Öğrenci desteği |
| Eğitim Altyapısı Oluşturma | `/researcher/educationinfrastructuredevelopmentactivity` | Laboratuvar, donanım, altyapı |
| Öğrenci Değerlendirme ve Eğitime Katkı | `/researcher/studentevaluationandcontributionactivitiestoeducation` | Ölçme ve değerlendirme katkısı |
| Verdiği Kurs ve Eğitimler | `/researcher/taughtcoursesandtraining` | Sürekli eğitim |
| Faaliyet Raporu | `/researcher/personalreport` | Yıl aralığına göre rapor dosyası (Faaliyet, Performans). En hızlı toplu kanıt. |
| Kurumsal Raporlar | `/report/home` | Birim düzeyi istatistikler |

Yayın, proje, atıf, ödül, hakemlik sayfaları da var (`/researcher/article`, `/researcher/project` vb.). Kurum düzeyi araştırma ve toplumsal katkı başlıklarında kullanılır.

## Ders düzenleme formu

Alanlar: dersin düzeyi, dersin türü (zorunlu/seçmeli), öğretim türü, araştırma alanları, ders konuları, ders adı (TR/EN), ders kodu, dersin dili, ders içeriği (zengin metin), Sürdürülebilir Kalkınma Amaçları, kurumsal ihtisas alanları. Dönem satırları: dönem, akademik yıl, haftalık teorik/pratik/laboratuvar saati, öğrenci sayısı, kredi, AKTS, dönemde toplam saat. Düğmeler: Dönem Ekle, Materyal Ekle, Kaydet, İptal.

**Öğrenme çıktısı alanı yoktur.** Ders ve program çıktıları Bologna Bilgi Paketi ya da OBS'den okunur.

## Program iyileştirme formu (`/create`)

| Alan | Değerler |
|---|---|
| Faaliyetin Düzeyi | Ön Lisans, Lisans, Yüksek Lisans, Yüksek Lisans-Tezsiz, Doktora, uzmanlık düzeyleri |
| Faaliyetin Kapsamı | Ders, Staj Faaliyeti, İntörnlük, Diğer Program Bileşeni, Uzmanlık Eğitimi, Programın Tümü |
| Faaliyetin Kredisi | metin |
| Katkı Düzeyi | Yüksek, Orta, Düşük |
| Başlangıç / Bitiş Tarihi | tarih |
| Faaliyetin Adı | metin |
| Açıklama | zengin metin |
| Dosyalar | belge ekleme |

Akreddit'te onaylanmış bir iyileştirme kaydı (bulgu → karar → uygulama) bu forma doğrudan karşılık gelir. Dosya ekleme kapalıdır, belgeyi kullanıcı ekler.

## Doldururken dikkat

- Zengin metin alanları görünür bir düzenleyicidir. Doğrudan gizli textarea'ya yazma, düzenleyiciye tıklayıp yaz.
- Seçim kutularında değer, ekranda görünen metindir (örnek "Orta Düzeyde Katkı"). Yazma planına bu metni koy.
- "Kaydet" kullanıcı onayıyla basılır. Kayıt sonrası sayfayı yeniden okuyup değerlerin oturduğunu doğrula.
