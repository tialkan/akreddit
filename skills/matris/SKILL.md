---
name: matris
description: Akreddit'te program çıktılarını ve ders öğrenme çıktılarını kaydetmek, aralarındaki katkı ilişkisi için 1-5 öneri üretmek ve ders-program çıktısı matrisini oluşturmak için kullan.
---

# Matris

## Çıktılar

Program çıktılarını ve ders çıktılarını **kullanıcının verdiği belgeden** al (izlence, Bologna sayfası, program tanıtımı). Uydurma.

- `akreddit cikti-ekle --tur program --kod PÇ1 --metin "…" --kanit <id>`
- `akreddit cikti-ekle --tur ders --ders TBP201 --kod DÇ1 --metin "…" --kanit <id>`

Çıktı metni değiştiyse eskisi silinmez, yeni sürüm yeni kodla eklenir.

## Katkı önerisi

Her ders çıktısı ile her program çıktısı çiftini düşün. Rubrik:

| Değer | Anlamı |
|---|---|
| `--iliskisiz` | Belgelerde ilişkiyi destekleyen bir temel yok |
| `--yetersiz` | Karar için bilgi eksik ya da okunamıyor |
| 1 | Konuya sınırlı temas, yardımcı katkı |
| 2 | Temel bir bileşeni açıklama ya da yönlendirilmiş alıştırma |
| 3 | Çıktının anlamlı bir bileşenini uygulama ve değerlendirme |
| 4 | Çıktıyı büyük ölçüde kapsayan, ölçme planıyla desteklenen uygulama |
| 5 | Çıktının temel sorumluluğunu taşıyan kapsamlı ve doğrudan değerlendirme |

- 0 kullanma. İlişki yoksa `--iliskisiz`.
- Bütün hücreleri doldurmak zorunda değilsin. Emin değilsen `--yetersiz`.
- 4 ve 5 için ölçme planını (sınav, proje, rubrik) `--kanit` ile göster.

`akreddit oner-matris --ders-cikti TBP201.DÇ1 --program-cikti PÇ3 --puan 3 --gerekce "…" --kanit <id> --konum "s. 2"`

## Karar ve tablo

Önerileri ders ders tablo hâlinde göster, kullanıcının kararını `akreddit karar` ile adıyla kaydet. Sonra `akreddit matris --csv` çalıştır ve tabloyu göster.

Kullanıcıya şunu hatırlat: matris ders tasarımının program çıktılarıyla uyumunu gösterir, öğrencilerin çıktıya ulaştığını göstermez. Başarı ölçümü için sınav verisi ve ayrı bir hesap gerekir.
