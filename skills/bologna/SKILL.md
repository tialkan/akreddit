---
name: bologna
description: Akreddit'te programın Bologna Bilgi Paketini okumak, ders ve program çıktılarını içeri almak ve paketi AKTS, değerlendirme, matris tutarlılığı gibi kurallarla denetlemek için kullan.
---

# Bologna Bilgi Paketi

Önce `${CLAUDE_PLUGIN_ROOT}/bilgi/bologna.md` haritasını oku.

1. Programın Bologna adresini kullanıcıdan iste. Kendisi bilmiyorsa üniversitenin Bologna sayfasında programı bulmasına yardım et. Adres `curSunit=` içermeli.
2. `akreddit bologna-al "<adres>"` çalıştır. Bir dakika kadar sürer, sunucuyu yormamak için sayfalar sırayla okunur. Kullanıcıya bekleyeceğini söyle.
3. `akreddit bologna-denetle` çalıştır. Raporun başındaki sayıları söyle, sonra en önemli üç bulgu grubunu sade dille açıkla. Tüm liste `raporlar/bologna-denetim.md` dosyasında.
4. Bulguların resmî kural olmadığını, kurumun kendi AKTS saat katsayısı farklıysa `--akts-saat` ile değiştirilebileceğini hatırlat.
5. Kullanıcı bir bulguyu düzeltmek isterse düzeltmenin nereye yapılacağını söyle: Bologna paketi genelde bölüm Bologna koordinatörü ya da OBS ders tanımları üzerinden güncellenir. Kendi yetkisi varsa `sisteme-yaz` skill'iyle, onaylı tablo üzerinden ilerle.
6. İçeri alınan çıktılar `akreddit ciktilar` ile görünür. Matris çalışmasına buradan devam edilebilir (`matris` skill'i).

Okunan veri tarihli bir kanıt dosyasıdır. Raporda Bologna verisinden söz ederken `[K:kod]` ile bu dosyayı göster.
