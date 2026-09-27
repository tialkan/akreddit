---
name: bologna-doldur
description: Hocanın OBS'de kendi adına kayıtlı derslerinin Bologna ders bilgi paketlerini denetleyip eksiksiz, doğru ve tutarlı biçimde doldurmak için kullan. Hoca ders adını ve birkaç cümle bilgi verir, Akreddit tam sayfa taslağını üretir, kurallardan geçirir ve onayla OBS'ye yazar.
---

# Bologna ders bilgi paketini doldurma

Önce oku: `${CLAUDE_PLUGIN_ROOT}/bilgi/obs.md` (ekranlar), `${CLAUDE_PLUGIN_ROOT}/bilgi/bologna.md` (herkese açık sayfalar), `${CLAUDE_PLUGIN_ROOT}/bilgi/bologna-taslak-ornek.json` (taslak biçimi ve iyi bir örnek).

Rolün: YÖKAK değerlendiricisinin titizliğiyle, o dersi fiilen veren bir öğretim elemanının alan hâkimiyetiyle çalışan Bologna ve AKTS uzmanı. Bu sayfa öğrencinin ders rehberi ve akreditasyonun resmî dayanağı. Kozmetik doldurma yapma.

## 0. Önce çıkar, sonra tek mesajda sor

`akreddit-kurallari` içindeki soru sorma kurallarına uy. Soru sormadan önce şunlardan doldur:

- Unvan, ad soyad, kurumsal e-posta ve AVESİS adresi: hocanın AVESİS profilinden ya da mevcut Bologna sayfalarındaki Dersi Veren alanından.
- Dersler: OBS'de hocanın üzerindeki dersler. Varsayılan: yalnız bu dönemin aktif dersleri.
- Ders içeriği: mevcut Bologna sayfası, programdaki benzer dersler, ders adı ve AKTS.

Sonra tek mesajda özet göster, yalnız bulunamayanları seçenekli sor:

```
Anladıklarım:
1. Dersi veren: Öğr. Gör. Ad Soyad, ad.soyad@uni.edu.tr (AVESİS'ten)
2. Kapsam: bu dönemin 4 aktif dersi (Önerilen). Pasif kayıtlar için "hepsi" yaz.
3. İçeriği zayıf dersler: TBP207 Mobil Programlama. Taslağı ders adından ve programdan çıkaracağım.

Doğruysa "tamam" de. Bir derste özel bir durum varsa yaz (örnek: "TBP207'de Flutter kullanıyorum, dönem projesi var").
```

İçeriği boş bir ders için hocaya ne anlattığını sorman gerekirse seçenek ver:

```
TBP207 Mobil Programlama'da hangi araçla ilerliyorsun?
A) Flutter ve Dart (Önerilen: programdaki diğer derslerle uyumlu)
B) Kotlin ile Android Studio
C) React Native
D) Kendin yaz
```

Hoca cevap vermezse ya da "sen karar ver" derse önerilenle ilerle, taslağı gösterirken bu seçimi açıkça belirt.
Hocayı yalnız her dersin onayında ve gerçekten gerekirse meşgul et.

## 1. Hazırlık

1. Programın Bologna adresini bul, `akreddit bologna-al "<adres>"` ve `akreddit bologna-denetle` çalıştır. Mevcut durumu ve programın resmî P1…Pn çıktılarını buradan al. Program çıktılarını asla ezberden yazma.
2. OBS'yi tarayıcıda aç, hoca giriş yapsın. Ders Bilgi Paketi Tanımları listesine git, hocanın derslerini çıkar. Önce aktif dersler.

## 2. Her ders için taslak

Dersin mevcut OBS içeriğini oku, sonra `raporlar/bologna/<KOD>.json` dosyasına **tam** taslak yaz (örnek dosyadaki biçim). Hata listesi:

- **K1** Ad ile amaç, içerik, çıktı ve haftalar tutmuyorsa (başka dersten kopya) baştan yaz. Bunu her derste kontrol et, doğrulayıcı yakalayamaz.
- **K2** Amaç 60-120, içerik 120-250, yöntem 40-90 kelime. İngilizcesi tam çeviri.
- **K3** "-", ".", boş, "Yok" ile alan doldurma (ön koşul hariç).
- **K4** Her çıktı ölçülebilir fiille biter: açıklar, uygular, tasarlar, geliştirir, karşılaştırır, değerlendirir. "Bilgi sahibi olur", "öğrenir" yok.
- **K5** 8-12 çıktı, Ö1'den kesintisiz. Çoğu Beceri, birkaçı Bilgi, en az biri Yetkinlik.
- **K6** Ders yapısı toplamı %100 ve içerikle tutarlı.
- **K7** 2-4 gerçekten ilgili SKA.
- **K8** Toplam iş yükü = AKTS × 30, tam eşit. **AKTS'yi değil saat dağılımını** değiştir.
- **K9** Her haftada ön hazırlık ve doküman. 14-16 hafta, 8. hafta ara sınav, son hafta yarıyıl sonu.
- **K10** Koordinatör ve dersi veren hocanın kendisi. Başka hocanın adını yazma.
- **K11** İki farklı dersin yöntem ya da notlarında birebir aynı cümleler olmasın.
- **K12** Katkı matrisinde her Ö satırı dolu, 1-5 ya da boş, ayrıştırılmış. "Tüm" satırına dokunma.
- Değerlendirme toplamı %100, uygulamalı derste uygulama/proje/ödev kalemi.
- Kaynaklar: en az 2 gerçek kaynak. Emin olmadığın kitabı, ISBN'i yazma.
- Türkçe karakterler eksiksiz (ı, İ, ğ, ü, ş, ö, ç). "Haftalik", "icin" gibi düşürülmüş yazım yok.

Taslağı `akreddit bologna-taslak-denetle raporlar/bologna/<KOD>.json` ile denetle. **HATA kalmayana kadar düzelt.** Uyarıları değerlendir.

## 3. Onay

Hocaya dersi kısa özetle göster: değişen alanlar, çıktı listesi, haftalık akış başlıkları, iş yükü dağılımı. Tam metin `raporlar/bologna/<KOD>.json` içinde. Hoca onaylarsa:

1. Dersin bütün yazılacak alanlarıyla tek plan aç: `akreddit yazma-plani --sistem OBS --adres "<ders düzenleme adresi>" --alanlar '<json>'`. Kaynak alanı: `K:<bologna kanıtı> s. <sekme>` ya da `kullanıcı beyanı`.
2. `akreddit yazma-onay <id> --onaylayan "<Ad Soyad>" --sure 90`.

Hoca "hepsini onaylıyorum" derse yine her ders için ayrı plan aç ve onayı ayrı kaydet.

## 4. Yazma

- Sekme sekme ilerle. Alanları `fill_form` ile doldur, sayfada JavaScript çalıştırma.
- Her sekmeden sonra Kaydet, "Kayıt Başarıyla Düzeltildi" iletisini doğrula, alanı yeniden okuyup Türkçe karakterleri kontrol et.
- Ders akışının ikinci sayfasını unutma.
- Silinmesi gereken satır varsa hocaya hangi satır olduğunu söyle, silmeyi o yapsın.
- Varsayılan izin modunda Claude Code her yazmada sorar. Tam yetki modunda sormaz, bu yüzden her sekmeden sonra ekran görüntüsü al ve günlüğe ekle.
- Ders bitince `akreddit yazma-bitir <id> tamamlandi --sonuc "<kısa özet>"`.

## 5. Rapor

```
Tamamlanan dersler (N): KOD, ad, yapılan düzeltmeler
Program çıktısı matrisi engellenenler: program, sebep
Tamamlanamayan ya da bilgi gereken dersler: ne eksik
```

Sonunda `akreddit bologna-al` ve `akreddit bologna-denetle` ile yeniden oku, ders ders önce ve sonra bulgu sayısını karşılaştır. Pasif kayıtlar için izin iste.

## Yasaklar

Bilgi uydurma, başka dersten kopyalama, geçiştirilmiş alan, matris şişirme, sessizce atlama yok. OBS dışında bir işlem (e-posta, başka sistem) gerekirse dur ve sor.
