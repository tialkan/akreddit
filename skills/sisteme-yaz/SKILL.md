---
name: sisteme-yaz
description: Akreddit'te onaylı kanıt ve kararlara dayanarak Bologna, AVESİS, OBS gibi kurum sistemlerinde alanları kullanıcının onayıyla doldurmak için kullan.
---

# Kurum sistemine yazma

AVESİS için önce `${CLAUDE_PLUGIN_ROOT}/bilgi/avesis.md` sistem haritasını oku. Hangi sayfada ne olduğunu ve form alanlarını orada bulursun. Harita yol göstericidir, sayfanın kendisi esastır.

Yazma her zaman üç kapıdan geçer: **tablo onayı**, **Claude Code'un izin sorusu**, **son gönderimin kullanıcıda kalması.** Bunlardan birini atlamaya çalışma.

## 1. Hazırlık

1. Kullanıcıyla hangi sayfada hangi alanları güncelleyeceğinizi konuş.
2. Sayfayı tarayıcıda aç. Giriş gerekiyorsa kullanıcı kendisi yapar, "tamam" demesini bekle.
3. Sayfayı oku, alanların **şu anki** değerlerini not et.
4. Her yeni değerin kaynağını bul: kanıt dosyası (`K:kod s. N`), onaylı öneri (`onaylı öneri #N`) ya da kullanıcının açıkça söylediği bilgi (`kullanıcı beyanı`). Kaynağı olmayan değeri yazma, `[EKSİK]` olarak kullanıcıya bildir.

## 2. Tablo ve onay

5. Planı kaydet:
   `akreddit yazma-plani --sistem "Bologna" --adres "<URL>" --alanlar '[{"alan":"…","mevcut":"…","yeni":"…","kaynak":"K:… s. N"}]'`
   Bir plan **tek sayfa** içindir.
6. Çıkan tabloyu kullanıcıya olduğu gibi göster. Değerleri tek tek okumasını iste. Metinler birebir yazılacak, sonradan değiştirilemez.
7. Kullanıcı "onaylıyorum" derse, adını sor ve kaydet: `akreddit yazma-onay <id> --onaylayan "<Ad Soyad>"`. Plan 20 dakika geçerlidir.

## 3. Doldurma

8. Alanları mümkünse tek seferde `fill_form` ile doldur. Böylece kullanıcı tek izin penceresi görür.
9. Her yazma işleminde Claude Code kullanıcıya soracak. Kullanıcıya şunu söyle: "Birazdan Claude Code izin soracak. Tarayıcıda doğru alanın dolduğunu gördüysen onayla."
10. Plan dışı bir değer, parola alanı, Enter ile gönderme ya da "Gönder / Onayla / Sun" düğmesi engellenir. Engellenirse nedenini kullanıcıya açıkla, zorlamaya çalışma.
11. Doldurduktan sonra sayfanın ekran görüntüsünü al, `gunluk/` altına kaydet.

## 4. Kaydetme ve gönderim

12. Sayfada "Kaydet" düğmesi varsa kullanıcıya sor. Evet derse bas (Claude Code yine izin sorar).
13. "Gönder", "Onaya sun", "Kesinleştir" gibi son adımlar **her zaman kullanıcıdadır.** "Kontrol ettikten sonra Gönder düğmesine sen bas" de.
14. İş bitince sonucu kaydet: `akreddit yazma-bitir <id> tamamlandi --sonuc "<ne yapıldı>"`. Vazgeçildiyse `iptal`.
15. `akreddit adim sisteme_yazildi --adres "<URL>" --ekran "<görüntü yolu>" --onaylayan "<Ad Soyad>"` ile kaydet.

Claude Code tam yetki ya da otomatik moddaysa yazma anında soru çıkmaz. Bu yüzden bu modlarda tablo onayını sohbette mutlaka al ve her sayfadan sonra ekran görüntüsünü göster.
