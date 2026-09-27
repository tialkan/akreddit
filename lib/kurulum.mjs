// Kurulum sihirbazı: teknik bilgisi olmayan bir kullanıcıyı model seçiminden ilk denemeye kadar götürür.
// Her soruda önerilen seçenek önce gelir, Enter önerileni seçer.
import { girdiAc } from "./girdi.mjs";
import { anahtarKaydet, ayarKaydet, HAZIRLAR, modelAyari, sohbetIstegi } from "./model.mjs";

const yaz = (m = "") => process.stdout.write(`${m}\n`);

async function secim(rl, soru, secenekler) {
  yaz(`\n${soru}`);
  secenekler.forEach((s, i) => yaz(`  ${String.fromCharCode(65 + i)}) ${s}${i === 0 ? "  (Önerilen)" : ""}`));
  while (true) {
    const c = await rl.sor("Seçimin (Enter = A): ");
    if (c === null) { yaz("Girdi bitti."); process.exit(1); }
    const buyuk = c.toUpperCase();
    if (!buyuk) return 0;
    const i = buyuk.charCodeAt(0) - 65;
    if (buyuk.length === 1 && i >= 0 && i < secenekler.length) return i;
    yaz(`Lütfen ${secenekler.map((_, j) => String.fromCharCode(65 + j)).join(", ")} harflerinden birini yaz.`);
  }
}

/** Bağlantıyı ve araç kullanımını dener. */
export async function baglantiDene(ayar = modelAyari()) {
  const cevap = await sohbetIstegi({ ayar, mesajlar: [{ role: "user", content: "Yalnız 'hazır' yaz." }] });
  let aracVar = false;
  try {
    const m = await sohbetIstegi({
      ayar,
      mesajlar: [{ role: "user", content: "saat_kac aracını çağır." }],
      araclar: [{ type: "function", function: { name: "saat_kac", description: "Saati döndürür.", parameters: { type: "object", properties: {} } } }],
    });
    aracVar = Boolean(m.tool_calls?.length);
  } catch { aracVar = false; }
  return { cevap: String(cevap.content ?? "").trim(), aracVar };
}

export async function kurulumSihirbazi() {
  const rl = girdiAc();
  yaz("Akreddit kurulumu");
  yaz("Birkaç soru soracağım. Her soruda Enter'a basarsan önerilen seçenek seçilir.");

  const i = await secim(rl, "Akreddit hangi yapay zekâ ile çalışsın?", [
    "EVREN: ücretsiz, veriler yurt içinde kalır, e-Devlet ile anahtar alınır",
    "Kurumumun kendi sunucusu (adresi bilgi işlem birimi verir)",
    "Bu bilgisayarda çalışan Ollama",
    "Başka bir OpenAI uyumlu hizmet",
  ]);

  let adres;
  let model;
  let anahtarGerekli = true;
  if (i === 0) {
    ({ adres, model } = HAZIRLAR.evren);
    yaz("\nEVREN anahtarını şöyle alırsın:");
    yaz("  1. Tarayıcında https://evren.ssyz.org.tr/llm-inference adresini aç.");
    yaz("  2. Sağ üstteki \"e-Devlet ile Giriş Yap\" düğmesine bas ve giriş yap.");
    yaz("  3. \"API Anahtarı Oluştur\" düğmesine bas.");
    yaz("  4. Oluşan anahtarı kopyala. evren_ ile başlar.");
  } else if (i === 1) {
    adres = (await rl.sor("\nSunucu adresi (örnek: https://yz.kurum.edu.tr/v1): ")) ?? "";
    model = (await rl.sor("Model adı (bilgi işlemin verdiği ad): ")) ?? "";
  } else if (i === 2) {
    adres = HAZIRLAR.ollama.adres;
    model = (await rl.sor("\nOllama'daki model adı (örnek: qwen3): ")) ?? "";
    anahtarGerekli = false;
  } else {
    adres = (await rl.sor("\nHizmetin adresi (/v1 ile biten): ")) ?? "";
    model = (await rl.sor("Model adı: ")) ?? "";
  }

  if (!adres || !model) { rl.kapat(); yaz("Adres ve model adı gerekli. Kurulumu yeniden başlat: akreddit kurulum"); process.exit(1); }
  ayarKaydet({ adres: adres.replace(/\/$/, ""), model });

  if (anahtarGerekli) {
    yaz("");
    const anahtar = (await rl.sor("Anahtarı buraya yapıştır ve Enter'a bas (ekranda nokta olarak görünür): ", { gizli: true })) ?? "";
    if (anahtar) anahtarKaydet(anahtar);
    else if (!modelAyari().anahtar) yaz("Anahtar girilmedi. Sonra yeniden: akreddit kurulum");
  }

  rl.kapat();
  yaz("\nBağlantıyı deniyorum…");
  try {
    const { cevap, aracVar } = await baglantiDene();
    yaz(`Bağlantı çalışıyor. Modelin cevabı: "${cevap.slice(0, 40)}"`);
    if (!aracVar) yaz("Uyarı: bu model araç kullanamıyor görünüyor. Akreddit en iyi araç kullanabilen modellerle çalışır.");
    yaz("\nHazır. Çalışmaya başlamak için şunu yaz ve Enter'a bas:");
    yaz("  akreddit ajan");
  } catch (e) {
    yaz(`Bağlantı kurulamadı: ${e.message}`);
    yaz("Adresi ve anahtarı kontrol edip yeniden dene: akreddit kurulum");
    process.exitCode = 1;
  }
}
