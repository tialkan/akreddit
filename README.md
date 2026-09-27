# Akreddit

Akreditasyon hazırlığı için açık kaynak yapay zekâ iş akışı.

Akreddit, kalite komisyonlarının ve kalite birimlerinin kanıt toplama, ders ve program çıktısı matrisi, öz değerlendirme raporu ve Bologna bilgi paketi işlerini hızlandırır. Her iddiayı bir kanıta bağlar. Her adımı kayda geçirir. Kararı hep insan verir.

Belirli bir yapay zekâ şirketine bağlı değildir. Kurumun kendi sunucusunda çalışan bir modelle de, OpenAI uyumlu herhangi bir hizmetle de çalışır. Veri kurumdan çıkmak zorunda değildir.

> Geliştiren ve destekleyen: **[Kulular Teknoloji](https://kulular.com.tr)**. Kurumlar için yazılım, web ve yapay zekâ uygulamaları. Akreddit'in kurumunuzda kurulumu, kendi sunucunuzda model çalıştırılması ve bakım için [kulular.com.tr](https://kulular.com.tr).

## Neler yapar

- **Bologna denetimi.** Programın herkese açık Bologna sayfalarını okur ve kurallarla denetler: AKTS ile iş yükü uyumu, değerlendirme toplamları, boş ders sayfaları, ders ve program çıktısı matrisinin tutarlılığı. Bir önlisans programının 87 ders sayfası bir dakikadan kısa sürede denetlendi.
- **Ders sayfası taslağı denetimi.** Yeni ya da düzeltilmiş bir Bologna ders sayfasını yayımlamadan önce 12 kurala göre kontrol eder: ölçülebilir öğrenme çıktıları, 14-16 haftalık akış, iş yükü = AKTS × 30, katkı matrisinin şişirilmemesi.
- **Kanıt kaydı.** Belgeleri özgün halleriyle saklar. Her dosya içeriğinin SHA-256 özetiyle adlanır, üzerine yazılmaz.
- **Kaynaklı rapor.** Öz değerlendirme metnindeki her iddianın gösterdiği kanıtın gerçekten var olup olmadığını denetler.
- **Çıktı matrisi.** Yapay zekâ öneri yapar, kullanıcı adıyla onaylar ya da reddeder. İlişki yoksa hücre boş kalır.
- **Değiştirilemez günlük.** Her öneri, karar ve onay tarihiyle ve onaylayanın adıyla saklanır. Kayıtlar silinemez ve değiştirilemez.
- **Ölçüm.** Harcanan süreyi, kabul ve ret oranlarını raporlar.

## İlkeler

1. Kanıtı olmayan iddia yazılmaz.
2. Kararı yapay zekâ değil, adıyla kayda geçen kişi verir.
3. Yapay zekâ çalışma klasörünün dışına çıkamaz, kanıt dosyalarını değiştiremez.
4. Kurum sistemlerinin parolası yapay zekâya verilmez.
5. Dış kuruma giden son gönderim düğmesine yapay zekâ basmaz.

Bu kurallar yapay zekâya yalnız söylenmez, kodla uygulanır. Ayrıntı: [`lib/ajan.mjs`](lib/ajan.mjs) ve [`scripts/koruma.mjs`](scripts/koruma.mjs).

## Kurulum

Adım adım, ekran ekran anlatım: **[tezatlas.com/akreddit/kurulum](https://tezatlas.com/akreddit/kurulum)**. Teknik bilgi gerektirmez.

Kısaca:

1. [nodejs.org](https://nodejs.org) adresinden Node.js'in LTS sürümünü kurun (22.13 ya da üstü).
2. Terminali açın (Windows'ta **Komut İstemi**) ve Akreddit'i kurun:

```bash
npm install -g https://github.com/tialkan/akreddit/archive/refs/heads/main.tar.gz
```

3. Yapay zekâ modelini seçin. Sihirbaz her adımı sorar, Enter önerileni seçer:

```bash
akreddit kurulum
```

4. Çalışmaya başlayın:

```bash
akreddit ajan
```

### Model seçenekleri

Akreddit, `/chat/completions` uç noktası sunan her sunucuyla çalışır. Araç kullanımını (tool calling) destekleyen bir model seçin.

| Seçenek | Ne zaman | Ayar |
|---|---|---|
| **EVREN** | Pilot ve bireysel kullanım. Yurt içi kamu altyapısı, anahtar e-Devlet girişiyle alınır. | `akreddit kurulum` → A |
| **Kurumun kendi sunucusu** | Kurumsal kullanım. Veri kurumdan çıkmaz. | `akreddit model --hazir vllm --model <ad>` |
| **Ollama** | Güçlü bir bilgisayarda, internetsiz deneme. | `akreddit model --hazir ollama --model <ad>` |
| **Başka bir uyumlu hizmet** | | `akreddit model --adres https://…/v1 --model <ad>` |

Anahtar `~/.config/akreddit/anahtar` dosyasında yalnız sizin okuyabileceğiniz biçimde saklanır. İsterseniz `AKREDDIT_API_ANAHTARI` ortam değişkeni de kullanılabilir. Ayarı sınamak için `akreddit model --dene`.

### Çalıştırma

`akreddit ajan` önce ne bildiğini özetler, yalnız eksik olanı sorar. Çalışma klasörleri Belgeler/Akreddit altında, program adıyla açılır. Sonraki seferlerde ajan bu klasörleri kendisi bulur ve kaldığı yerden devam etmeyi önerir. Her soruda önerilen bir seçenek ve kendi cevabını yazma imkânı vardır.

Ajan PDF (sayfa numaralarıyla) ve Word belgelerini doğrudan okur. Taranmış, metin içermeyen PDF'ler için metin içeren bir sürüm gerekir.

Gözetimsiz çalıştırmak için:

```bash
akreddit ajan --tek "Programın Bologna paketini al ve denetle: https://obs.uni.edu.tr/oibs/bologna/..."
```

Gözetimsiz kipte onay gerektiren hiçbir işlem yapılmaz.

### Claude Code ile

Claude aboneliği olanlar Akreddit'i Claude Code eklentisi olarak da kullanabilir. Bu yolda tarayıcıyla kurum sistemlerinden okuma ve onaylı alan doldurma da vardır.

```
/plugin marketplace add tialkan/akreddit
/plugin install akreddit@akreddit
```

Sonra çalışma klasöründe `/akreddit:baslat`.

## Komutlar

Bütün komutlar: `akreddit`. Sık kullanılanlar:

| Komut | Ne yapar |
|---|---|
| `akreddit kur <klasör>` | Çalışma klasörü oluşturur |
| `akreddit bologna-al <adres>` | Programın Bologna paketini kanıt olarak alır |
| `akreddit bologna-denetle` | Bologna paketini denetler, raporu `raporlar/` altına yazar |
| `akreddit bologna-taslak-denetle <dosya.json>` | Ders sayfası taslağını 12 kurala göre denetler |
| `akreddit kanit-ekle <dosya…>` | Belgeleri kanıt olarak ekler |
| `akreddit rapor-denetle <dosya.md>` | Rapordaki kanıt göstergelerini denetler |
| `akreddit pilot-raporu` | Süre ve karar oranlarını raporlar |

## Kurumlar için

Akreddit bir kurumun kendi donanımında, internete kapalı bir ağda bile çalışabilir. Önerilen yapı:

- **Donanım:** kurumun kendi şartnamesiyle aldığı, açık ağırlıklı bir dil modelini çalıştıran sunucu.
- **Yazılım:** Akreddit, açık kaynak ve ücretsiz.
- **Kurulum ve bakım:** ayrı bir hizmet olarak.

## Katkı

Hata bildirimi ve öneriler için [Issues](https://github.com/tialkan/akreddit/issues). Testler:

```bash
npm test
```

## Lisans

[Apache Lisansı 2.0](LICENSE). "Akreddit" adı ve logosu lisans kapsamında değildir. Ayrıntı: [NOTICE](NOTICE).

Copyright 2026 Tarık İsmet ALKAN · [Kulular Teknoloji](https://kulular.com.tr)
