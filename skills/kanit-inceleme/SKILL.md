---
name: kanit-inceleme
description: Akreddit çalışma klasöründe kullanıcının verdiği belgeleri (PDF, Word, fotoğraf, tutanak, izlence, sınav) kanıt olarak eklemek, okumak ve kalite başlıklarına etiket önermek için kullan.
---

# Kanıt inceleme

1. Kullanıcının verdiği dosyaları `akreddit kanit-ekle <dosya…>` ile ekle. Özgün dosya salt okunur kopyalanır.
2. `akreddit kanitlar` ile kısa kodları al (K:xxxxxxxx).
3. Her dosyayı oku. Taranmış belgede okunamayan yer varsa "okunamadı" de, tahmin etme.
4. Dosyanın **ne olduğunu** (tutanak, izlence, sınav, anket, protokol) ve **neyi gösterdiğini** bir iki cümleyle söyle. Neyi göstermediğini de söyle: bir toplantı tutanağı kararın alındığını gösterir, uygulandığını göstermez.
5. İlgili kalite başlığını öner: `akreddit oner-etiket --kanit <id> --baslik "<başlık>" --gerekce "<neden>" --konum "s. N"`. Bir dosya birden fazla başlığa kanıt olabilir, her biri ayrı öneri.
6. Önerileri kullanıcıya tablo olarak göster (dosya, başlık, gerekçe, sayfa, önerilen karar). Tek tek sorma. Şöyle bitir: "A) Hepsini önerildiği gibi onayla (Önerilen)  B) Şu satırları değiştir: numara ve düzeltme yaz  C) Tek tek inceleyelim".
7. Kararı kullanıcının adıyla kaydet: `akreddit karar <id> onayla|reddet|duzelt --onaylayan "<Ad Soyad>"`. Kararı sen veremezsin. Kullanıcı "hepsini onayla" derse tek tek kaydet.

Belgede kişisel veri (öğrenci adı, numarası, notu) varsa kullanıcıyı uyar ve raporda kimliksiz özet kullan.
