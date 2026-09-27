---
name: rapor
description: Akreddit'te öz değerlendirme raporu ya da başka bir kalite raporu bölümünü, yalnız onaylı kanıtlara dayanarak ve her iddiaya kaynak göstererek taslak olarak yazmak için kullan.
---

# Rapor taslağı

1. Hangi bölümü yazacağınızı ve çerçevenin o bölümde ne istediğini kullanıcının verdiği ölçüt belgesinden oku.
2. `akreddit oneriler --durum onaylandi` ve `akreddit kanitlar` ile kullanabileceğin kanıtları gör. Yalnız onaylı etiketi olan kanıtlara dayan.
3. Bölümü `raporlar/<bolum-adi>.md` dosyasına yaz. Kurallar:
   - Her olgusal cümleden sonra kaynak göster: `[K:xxxxxxxx s. N]`.
   - Kanıtı olmayan ama gereken bilgiyi `[EKSİK: ne gerekiyor]` diye işaretle. Yapılmış gibi yazma.
   - Sayı, oran, tarih ancak kanıtta geçiyorsa yazılır. Hesap gerekiyorsa betik yaz ve betiği de kaynak göster.
   - Akademik, açık, kısa cümleler. Abartı ve süsleme yok.
   - Plan, uygulama ve sonuç kanıtlarını ayırt et. "Karar alındı" ile "uygulandı" aynı şey değil.
4. Kullanıcıya göstermeden önce `akreddit rapor-denetle raporlar/<dosya>.md` çalıştır. HATA varsa düzelt. Uyarıları kullanıcıya söyle.
5. Taslağı özetle: kaç kanıta dayandı, kaç eksik var. Eksikler için ne yapılması gerektiğini madde madde yaz.
6. Kullanıcı bölümü onaylarsa `akreddit adim bolum_onaylandi --ayrinti '{"dosya":"…"}' --onaylayan "<Ad Soyad>"` ile kaydet ve git commit oluştur.
