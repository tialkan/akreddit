# OBS (Proliz) öğretim elemanı ekranları

Kaynak: AYBÜ öğretim elemanlarının kullandığı Bologna doldurma talimatı (deneyimle öğrenilmiş notlar). Akreddit bu ekranları henüz kendisi incelemedi. **Her adımda sayfanın anlık görüntüsünü al, bu notu yol gösterici say.** Farklılık görürsen `akreddit adim sistem_farki --ayrinti '<json>'` ile kaydet.

## Giriş

`https://obs.<kurum>.edu.tr/oibs/acd/login.aspx`. Hoca e-Devlet ya da kurum parolasıyla kendisi girer. Ana sayfa `…/oibs/acd/index.aspx`. İçerik `IFRAME1` adlı çerçevenin içindedir.

## Ders Bilgi Paketi Tanımları

1. Sol üstteki menü (☰) → ilk simge (Ders İşlemleri) → **Ders Bilgi Paketi Tanımları**.
2. Sağ üstteki **Tüm Dersleri Göster** işaretlenirse pasif (eski müfredat) kayıtlar da gelir.
3. Liste sütunları: Ders Kodu, Adı, Fakülte, Program, Müfredat (Aktif/Pasif), T.Oran (tamamlanma yüzdesi). %100 görünen ders de içerik olarak hatalı olabilir.
4. Her satırda **"Ders Bilgi Paketi Tanımlarını Aç"** başlıklı bağlantı düzenleme ekranını açar. Listede bir de "Ders Bilgi Paketi Bilgilerini Kopyala" simgesi vardır.

Hoca yalnız bu dönem verdiği dersleri, genelde ders kayıt haftasında düzenleyebilir. İdareciler her zaman düzenleyebilir.

## Düzenleme ekranı sekmeleri

| Sekme | Kimlik | İçerik |
|---|---|---|
| Ders Bilgileri | `tabDersBilgileri` | Amaç, içerik, notlar, yöntem (TR/EN), değerlendirme, AKTS iş yükü, ders yapısı, kaynak URL |
| Öğrenme Çıktıları | `tabOgrenmeCikti` | Ö1…Ön ve Bilgi/Beceri/Yetkinlik türü |
| Ders Akışı | `tabDersAkisi` | Hafta, konu (TR/EN), ön hazırlık, dokümanlar. 14'ten fazla satırda ikinci sayfa olur (`« ‹ 14-1/2 › »`) |
| Diğer Kaynaklar | `tabKaynaklar` | Yazar, eser, yayınevi |
| Prg.Çıktısına Katkısı | `tabDersPrgCiktiKatki` | Tüm + Ö satırları × P sütunları, 1-5. Kendi Kaydet düğmesi var. Hücre kimliği `grdGenel_txtP{sütun}_{satır}` (satır 0 Tüm) |
| Dersin Yetkilileri | `tabYetkililer` | Koordinatör, dersi veren: ad, AVESİS, e-posta |
| Ders Önerileri | `tabDersOneri` | Önerilen diğer dersler |
| Sür. Kalkınma Amaçları | `tabSurKalAmac` | "Hedef Seç" ile 2-4 SKA |
| Toplu Aktarım | | Kullanılmaz |

## Dikkat

- Sol kenar çubuğu içeriğin üstüne binebilir, menü düğmesine yeniden basınca kapanır.
- Kalem (düzenle) ve eksi (sil) simgeleri küçüktür, tıklamadan önce anlık görüntüyle doğrula.
- Silme bir onay penceresi açar. Akreddit onay pencerelerine basmaz, silmeyi hoca yapar.
- Her kayıttan sonra "Kayıt Başarıyla Düzeltildi" iletisini gör, sonra alanı yeniden okuyup Türkçe karakterleri kontrol et.
- "Dersin bağlı olduğu programın öğrenme çıktıları bulunamadı" uyarısı, programın kendi çıktılarının tanımsız olduğunu gösterir. Ders düzeyinde çözülmez, rapora yaz.
