# Bologna Bilgi Paketi sistem haritası

Kaynak: AYBÜ Bologna Bilgi Paketi (Proliz OBS), 26 Eylül 2026. Herkese açıktır, giriş gerekmez. Proliz OBS birçok üniversitede kullanılır, adres yapısı aynıdır: `https://obs.<kurum>.edu.tr/oibs/bologna/`. Başka bir sağlayıcı kullanan üniversitede bu harita geçerli değildir, sayfayı oku.

## Program sayfaları

Program adresi `index.aspx?…&curSunit=<program kimliği>` biçimindedir. Alt sayfalar `<sayfa>.aspx?lang=tr&curSunit=<kimlik>`:

| Sayfa | İçerik |
|---|---|
| `progLearnOutcomes` | Program öğrenme çıktıları (P1, P2, …) |
| `progCourseMatrix` | Ders × program çıktısı matrisi, yarıyıl yarıyıl. "-" ilişkisiz demektir |
| `progTYYCMatrix` | Program çıktıları × TYYÇ (bilgi, beceri, yetkinlik) |
| `progCourses` | Ders listesi. Her dersin kimliği `prolizOpenCourseDetails('<id>')` içinde |
| `progCourseDetails?curCourse=<id>` | Dersin tüm bilgisi (aşağıda) |
| `progGoalsObjectives`, `progProfile`, `progAbout` | Amaç, profil, tanıtım |
| `progDegree`, `progAdmissionReq`, `progGraduationReq`, `progRecogPriorLearning` | Derece, kabul, mezuniyet, önceki öğrenmenin tanınması |
| `progOccupationalProf`, `progAccessFurhterStudies`, `progOfficials` | Meslek profili, üst öğrenim, yetkililer |

## Ders sayfası

Yarıyıl, kod, ad, T+U+L, ulusal kredi, AKTS, son güncelleme. Dil, düzey, tür, öğretim şekli, amaç, içerik, yöntem, ön koşul, koordinatör. Kaynaklar. Ders yapısı yüzdeleri. Değerlendirme ölçütleri (sayı ve katkı yüzdesi). AKTS iş yükü tablosu. Öğrenme çıktıları (Ö1, Ö2, …). Haftalık konular. "Dersin Program Çıktılarına Katkısı" tablosu: "Tüm" satırı dersin genel katkısı, Ö satırları her çıktının katkısı. Katkı ölçeği 1 çok düşük, 5 çok yüksek.

Boş derslerde sayfa "Kayıt Yok…" gösterir.

## Akreddit komutları

- `akreddit bologna-al "<program adresi>"`: bütün sayfaları sırayla okur, JSON olarak kanıta kaydeder, çıktıları içeri alır.
- `akreddit bologna-denetle`: kuralları uygular, `raporlar/bologna-denetim.md` yazar.

## Denetim kuralları

Resmî ölçüt değildir, tutarsızlığı gösterir.

| Kural | Ne arar |
|---|---|
| Boş ders sayfası | Zorunlu derste hata, seçmelide uyarı |
| AKTS ve iş yükü | Toplam iş yükü / AKTS, varsayılan 25-30 saat dışında mı (`--akts-saat` ile değişir) |
| Değerlendirme | Katkılar toplamı %100 mü |
| Ders yapısı | Yüzdeler toplamı %100 mü |
| Ulusal kredi | T+U+L varken kredi 0 mı |
| Ders çıktıları, haftalar | Çıktı yok mu, 14 haftadan az mı |
| Güncellik | Son güncelleme 12 aydan eski mi |
| Matris tutarlılığı | Ders sayfasındaki "Tüm" satırı program matrisiyle aynı mı |
| Katkı desteği | Genel katkı, ders çıktılarının en yüksek katkısını aşıyor mu |
| Ayrımsız satır | Bir dersin bütün dolu hücreleri aynı yüksek değer mi |
| Boş matris satırı | Zorunlu dersin satırı tamamen boş mu |
| TYYÇ | Hiç ilişki işaretlenmiş mi |
