// Akreddit ajanı: OpenAI uyumlu herhangi bir modelle çalışan araç döngüsü.
//
// Güvenlik kuralları modelin iyi niyetine bırakılmaz, burada kodla uygulanır:
// - Dosya araçları çalışma klasörünün dışına çıkamaz. Yazma yalnız raporlar/ altına yapılır.
// - Model yalnız akreddit komutlarını çalıştırabilir. Kabuk, ağ ve tarayıcı aracı yoktur.
// - karar ve yazma-onay komutlarında onayı ve onaylayanın adını kullanıcı ekranda kendisi verir.
// - --tek kipinde (gözetimsiz) onay gerektiren komutlar reddedilir, sorular önerilen seçenekle geçer.
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { belgeMetni } from "./belge.mjs";
import { girdiAc } from "./girdi.mjs";
import { modelAyari, sohbetIstegi } from "./model.mjs";

const KOK = fileURLToPath(new URL("..", import.meta.url));
const BIN = join(KOK, "bin", "akreddit");
const CIKTI_SINIRI = 20000;
const TUR_SINIRI = 60;
const YASAK_KOMUTLAR = new Set(["ajan", "model", "kurulum"]);
const ONAYLI_KOMUTLAR = new Set(["karar", "yazma-onay"]);

const yaz = (m = "") => process.stdout.write(`${m}\n`);
const sinirla = (m) => (m.length > CIKTI_SINIRI ? `${m.slice(0, CIKTI_SINIRI)}\n… (${m.length - CIKTI_SINIRI} karakter kısaltıldı)` : m);

export function klasorBul(baslangic) {
  let k = resolve(baslangic);
  while (true) {
    if (existsSync(join(k, "AKREDDIT.md")) && existsSync(join(k, "kayit", "akreddit.sqlite"))) return k;
    const ust = dirname(k);
    if (ust === k) return null;
    k = ust;
  }
}

function beceriler() {
  const klasor = join(KOK, "skills");
  return readdirSync(klasor).filter((ad) => existsSync(join(klasor, ad, "SKILL.md"))).map((ad) => {
    const metin = readFileSync(join(klasor, ad, "SKILL.md"), "utf8");
    return { ad, aciklama: metin.match(/^description:\s*(.+)$/m)?.[1] ?? "", metin: metin.replace(/^---[\s\S]*?---\s*/, "") };
  });
}

function sistemMesaji() {
  const liste = beceriler().map((b) => `- ${b.ad}: ${b.aciklama}`).join("\n");
  const kurallar = beceriler().find((b) => b.ad === "akreddit-kurallari")?.metin ?? "";
  return `${readFileSync(join(KOK, "lib", "ajan-sistem.md"), "utf8")}\n## Beceriler\n\n${liste}\n\n## Her zaman geçerli kurallar\n\n${kurallar}\nBugünün tarihi: ${new Date().toISOString().slice(0, 10)}.`;
}

const ARACLAR = [
  {
    ad: "komut_calistir",
    aciklama: "Bir akreddit komutunu çalıştırır ve çıktısını döndürür. Örnek: [\"bologna-al\", \"https://obs.uni.edu.tr/oibs/bologna/...\"]",
    parametreler: { argumanlar: { type: "array", items: { type: "string" }, description: "akreddit kelimesi olmadan komut ve argümanları" } },
    zorunlu: ["argumanlar"],
  },
  {
    ad: "dosya_listele",
    aciklama: "Çalışma klasöründeki bir alt klasörün içeriğini listeler.",
    parametreler: { yol: { type: "string", description: "Göreli yol. Kök için \".\"" } },
    zorunlu: ["yol"],
  },
  {
    ad: "dosya_oku",
    aciklama: "Çalışma klasöründeki bir PDF, Word (.docx), metin, Markdown, JSON, CSV ya da HTML dosyasını okur. PDF'lerde sayfa numaraları '--- Sayfa N ---' ile gösterilir.",
    parametreler: {
      yol: { type: "string" },
      baslangic_satir: { type: "integer", description: "1'den başlar" },
      satir_sayisi: { type: "integer" },
    },
    zorunlu: ["yol"],
  },
  {
    ad: "dosya_yaz",
    aciklama: "raporlar/ altına bir dosya yazar. Var olan dosyanın üzerine yazar.",
    parametreler: { yol: { type: "string", description: "raporlar/ ile başlamalı" }, icerik: { type: "string" } },
    zorunlu: ["yol", "icerik"],
  },
  {
    ad: "kullaniciya_sor",
    aciklama: "Kullanıcıya seçenekli bir soru sorar. İlk seçenek önerilendir. Kullanıcı kendi cevabını da yazabilir.",
    parametreler: {
      soru: { type: "string" },
      secenekler: { type: "array", items: { type: "string" }, description: "2-4 somut seçenek, ilki önerilen" },
      onerilen_gerekce: { type: "string", description: "İlk seçeneğin neden önerildiği, tek cümle" },
    },
    zorunlu: ["soru", "secenekler"],
  },
  {
    ad: "beceri_oku",
    aciklama: "Bir becerinin ayrıntılı talimatını döndürür.",
    parametreler: { ad: { type: "string" } },
    zorunlu: ["ad"],
  },
].map((a) => ({
  type: "function",
  function: { name: a.ad, description: a.aciklama, parameters: { type: "object", properties: a.parametreler, required: a.zorunlu } },
}));

class Oturum {
  constructor({ tek, girdi }) {
    this.tek = tek;
    this.girdi = girdi;
    this.dizin = process.cwd();
  }

  get klasor() { return klasorBul(this.dizin); }
  get kok() { return this.klasor ?? this.dizin; }

  /** Göreli yolu çalışma klasörüne sabitler. Klasör dışına çıkan yolları reddeder. */
  guvenliYol(yol) {
    const kok = realpathSync(this.kok);
    const icinde = (p) => p === kok || p.startsWith(kok + sep);
    const tam = resolve(kok, String(yol || "."));
    if (!icinde(tam)) throw new Error("Bu yol çalışma klasörünün dışında.");
    // Sembolik bağlantıyla dışarı çıkılmasın: var olan en yakın üst klasörün gerçek yolu da içeride olmalı.
    let mevcut = tam;
    while (!existsSync(mevcut)) mevcut = dirname(mevcut);
    if (!icinde(realpathSync(mevcut))) throw new Error("Bu yol çalışma klasörünün dışında.");
    return tam;
  }

  gunluk(kayit) {
    const k = this.klasor;
    if (!k) return;
    mkdirSync(join(k, "gunluk"), { recursive: true });
    const zaman = new Date().toISOString();
    appendFileSync(join(k, "gunluk", `${zaman.slice(0, 10)}.jsonl`), `${JSON.stringify({ zaman, eylem: "ajan_arac", ...kayit })}\n`);
  }

  async sor(metin) {
    if (!this.girdi) return null;
    return this.girdi.sor(metin);
  }

  async komutCalistir({ argumanlar }) {
    const arg = (Array.isArray(argumanlar) ? argumanlar : []).map(String);
    if (arg[0] === "akreddit") arg.shift();
    if (!arg.length || YASAK_KOMUTLAR.has(arg[0])) return "Bu komut ajan içinden çalıştırılamaz.";
    if (ONAYLI_KOMUTLAR.has(arg[0])) {
      if (this.tek) return "Gözetimsiz kipte onay verilemez. Bu kararı kullanıcı etkileşimli oturumda verir.";
      yaz(`\nOnay gerekiyor: akreddit ${arg.join(" ")}`);
      const cevap = await this.sor("Onaylıyor musun? (e/h) ");
      if (!/^e/i.test(cevap ?? "")) return "Kullanıcı onaylamadı.";
      const ad = await this.sor("Onaylayanın adı soyadı: ");
      if (!ad) return "Onaylayan adı verilmedi, işlem yapılmadı.";
      const i = arg.indexOf("--onaylayan");
      if (i >= 0) arg.splice(i, 2);
      arg.push("--onaylayan", ad);
    }
    let cikti;
    let kod = 0;
    try {
      cikti = execFileSync(process.execPath, [BIN, ...arg], { cwd: this.dizin, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 15 * 60 * 1000 });
    } catch (e) {
      kod = e.status ?? 1;
      cikti = `${e.stdout ?? ""}${e.stderr ?? ""}` || e.message;
    }
    if (arg[0] === "kur" && kod === 0) this.dizin = resolve(this.dizin, arg[1] || ".");
    return sinirla(`${cikti.trim()}${kod ? `\n(çıkış kodu ${kod})` : ""}`);
  }

  dosyaListele({ yol }) {
    const tam = this.guvenliYol(yol);
    return readdirSync(tam, { withFileTypes: true })
      .filter((d) => !d.name.startsWith("."))
      .map((d) => (d.isDirectory() ? `${d.name}/` : `${d.name} (${statSync(join(tam, d.name)).size} bayt)`))
      .join("\n") || "(boş)";
  }

  async dosyaOku({ yol, baslangic_satir: bas = 1, satir_sayisi: adet = 400 }) {
    const { metin, uyari } = await belgeMetni(this.guvenliYol(yol));
    if (uyari) return uyari;
    const satirlar = metin.split("\n");
    const b = Math.max(1, Number(bas) || 1);
    const parca = satirlar.slice(b - 1, b - 1 + (Number(adet) || 400));
    const son = b - 1 + parca.length;
    return sinirla(`${parca.join("\n")}${son < satirlar.length ? `\n… (${satirlar.length} satırın ${b}-${son} arası gösterildi)` : ""}`);
  }

  dosyaYaz({ yol, icerik }) {
    if (!this.klasor) return "Önce bir çalışma klasörü kurulmalı (kur komutu).";
    const tam = this.guvenliYol(yol);
    const raporlar = join(realpathSync(this.klasor), "raporlar") + sep;
    if (!tam.startsWith(raporlar)) return "Yalnız raporlar/ altına yazılabilir. Kanıt dosyaları değiştirilemez.";
    mkdirSync(dirname(tam), { recursive: true });
    writeFileSync(tam, String(icerik ?? ""));
    return `Yazıldı: ${relative(this.klasor, tam)}`;
  }

  async kullaniciyaSor({ soru, secenekler = [], onerilen_gerekce: gerekce }) {
    const liste = secenekler.map(String).slice(0, 4);
    if (this.tek || !this.girdi) return JSON.stringify({ secilen: liste[0] ?? null, not: "Gözetimsiz kip: önerilen seçenek kullanıldı." });
    yaz(`\n${soru}`);
    liste.forEach((s, i) => yaz(`  ${String.fromCharCode(65 + i)}) ${s}${i === 0 ? ` (Önerilen${gerekce ? `: ${gerekce}` : ""})` : ""}`));
    yaz(`  ${String.fromCharCode(65 + liste.length)}) Kendi cevabını yaz`);
    const cevap = (await this.sor("> ")) ?? "";
    const harf = cevap.toUpperCase().match(/^([A-E])\)?$/)?.[1];
    const sayi = cevap.match(/^([1-4])$/)?.[1];
    const sira = harf ? harf.charCodeAt(0) - 65 : sayi ? Number(sayi) - 1 : null;
    if (!cevap || /^(öneri|önerilen|sen karar ver|sen seç|tamam|evet)$/i.test(cevap)) return JSON.stringify({ secilen: liste[0] });
    if (sira !== null && liste[sira]) return JSON.stringify({ secilen: liste[sira] });
    if (sira === liste.length) {
      const kendi = (await this.sor("Cevabını yaz: ")) ?? "";
      return JSON.stringify(kendi ? { kullanicinin_cevabi: kendi } : { secilen: liste[0] });
    }
    return JSON.stringify({ kullanicinin_cevabi: cevap });
  }

  beceriOku({ ad }) {
    const b = beceriler().find((x) => x.ad === String(ad));
    return b ? b.metin : `Böyle bir beceri yok. Var olanlar: ${beceriler().map((x) => x.ad).join(", ")}`;
  }

  async aracCalistir(cagri) {
    let arg;
    try { arg = JSON.parse(cagri.function.arguments || "{}"); } catch { return "Araç argümanları geçerli JSON değil."; }
    const ad = cagri.function.name;
    const tablo = {
      komut_calistir: () => this.komutCalistir(arg),
      dosya_listele: () => this.dosyaListele(arg),
      dosya_oku: () => this.dosyaOku(arg),
      dosya_yaz: () => this.dosyaYaz(arg),
      kullaniciya_sor: () => this.kullaniciyaSor(arg),
      beceri_oku: () => this.beceriOku(arg),
    };
    if (!tablo[ad]) return `Bilinmeyen araç: ${ad}`;
    process.stderr.write(`· ${ad === "komut_calistir" ? `akreddit ${(arg.argumanlar || []).join(" ")}` : `${ad} ${arg.yol ?? arg.ad ?? ""}`}\n`);
    let sonuc;
    try { sonuc = await tablo[ad](); } catch (e) { sonuc = `Hata: ${e.message}`; }
    this.gunluk({ arac: ad, arg: ad === "dosya_yaz" ? { yol: arg.yol, uzunluk: String(arg.icerik ?? "").length } : arg });
    return String(sonuc);
  }
}

/** Bir kullanıcı mesajını, model araç çağırmayı bırakana kadar işler. */
async function tur(oturum, mesajlar) {
  for (let i = 0; i < TUR_SINIRI; i++) {
    const m = await sohbetIstegi({ mesajlar, araclar: ARACLAR });
    const cagrilar = m.tool_calls ?? [];
    mesajlar.push({ role: "assistant", content: m.content ?? "", ...(cagrilar.length ? { tool_calls: cagrilar } : {}) });
    if (m.content?.trim()) yaz(`\n${m.content.trim()}\n`);
    if (!cagrilar.length) return;
    for (const c of cagrilar) {
      mesajlar.push({ role: "tool", tool_call_id: c.id, content: await oturum.aracCalistir(c) });
    }
  }
  yaz("Bu adım çok uzadı, burada durdum. Devam etmek için bir şey yaz.");
}

function oturumuKaydet(oturum) {
  const k = oturum.klasor;
  if (!k || !existsSync(join(k, ".git"))) return;
  try {
    execFileSync("git", ["add", "-A"], { cwd: k, stdio: "ignore" });
    execFileSync("git", ["commit", "-q", "-m", `Akreddit oturumu ${new Date().toISOString().slice(0, 16).replace("T", " ")}`], { cwd: k, stdio: "ignore" });
  } catch { /* değişiklik yoksa commit oluşmaz */ }
}

export async function ajanBaslat(s) {
  const ayar = modelAyari();
  if (!ayar.adres || !ayar.model) {
    yaz("Akreddit'in hangi yapay zekâ modeliyle çalışacağını seçmen gerekiyor. En kolayı:");
    yaz("  akreddit kurulum");
    yaz("Elle ayarlamak için örnekler:");
    yaz("  akreddit model --hazir vllm --model <model-adı>      Kurumun kendi sunucusu");
    yaz("  akreddit model --hazir ollama --model <model-adı>    Bu bilgisayarda Ollama");
    yaz("  akreddit model --adres https://sunucu/v1 --model <model-adı>   Başka bir uyumlu sunucu");
    process.exit(1);
  }
  const tek = typeof s.tek === "string" ? s.tek : null;
  const girdi = tek ? null : girdiAc();
  const oturum = new Oturum({ tek: Boolean(tek), girdi });
  const mesajlar = [{ role: "system", content: sistemMesaji() }];

  try {
    if (tek) {
      mesajlar.push({ role: "user", content: `${tek}\n\n(Gözetimsiz kip: soru sorma, önerilen seçeneklerle ilerle, bitince ne yaptığını özetle.)` });
      await tur(oturum, mesajlar);
      return;
    }
    yaz(`Akreddit · model: ${ayar.model}. Çıkmak için "çık" yaz.`);
    mesajlar.push({ role: "user", content: s._.join(" ") || "Oturumu başlat." });
    await tur(oturum, mesajlar);
    while (true) {
      const girdiMetni = await oturum.sor("> ");
      if (girdiMetni === null || /^(çık|cik|exit|quit)$/i.test(girdiMetni)) break;
      if (!girdiMetni) continue;
      mesajlar.push({ role: "user", content: girdiMetni });
      await tur(oturum, mesajlar);
    }
  } catch (e) {
    process.stderr.write(`${e.message}\n`);
    process.exitCode = 1;
  } finally {
    girdi?.kapat();
    oturumuKaydet(oturum);
  }
}
