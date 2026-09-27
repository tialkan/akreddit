// Model ayarı ve OpenAI uyumlu sohbet isteği.
// Akreddit belirli bir yapay zekâ sağlayıcısına bağlı değildir. /chat/completions uç noktası sunan
// her sunucu çalışır: kurumun kendi sunucusu (vLLM, SGLang), Ollama, EVREN, OpenAI ya da OpenRouter.
// API anahtarı ayar dosyasına yazılmaz. Ya ortam değişkeninden okunur ya da yalnız kullanıcının
// okuyabildiği ayrı bir dosyada (izin 600) durur. Kurulum sihirbazı anahtarı ekranda göstermeden alır.
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const AYAR_KLASORU = join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "akreddit");
const AYAR_DOSYASI = join(AYAR_KLASORU, "model.json");
const ANAHTAR_DOSYASI = join(AYAR_KLASORU, "anahtar");
const VARSAYILAN_ANAHTAR = "AKREDDIT_API_ANAHTARI";

export const HAZIRLAR = {
  evren: { adres: "https://evren-llmapi.ssyz.org.tr/v1", model: "glm-5.3", aciklama: "EVREN, yurt içi kamu altyapısı (anahtar e-Devlet girişiyle alınır)" },
  vllm: { adres: "http://localhost:8000/v1", aciklama: "Kurumun kendi sunucusu (vLLM, varsayılan port)" },
  ollama: { adres: "http://localhost:11434/v1", aciklama: "Aynı bilgisayarda Ollama" },
  openai: { adres: "https://api.openai.com/v1", aciklama: "OpenAI (veri yurt dışına çıkar)" },
  openrouter: { adres: "https://openrouter.ai/api/v1", aciklama: "OpenRouter (veri yurt dışına çıkar)" },
};

function dosyadanOku() {
  try { return JSON.parse(readFileSync(AYAR_DOSYASI, "utf8")); } catch { return {}; }
}

/** Ortam değişkenleri dosyadaki ayarın önüne geçer. */
export function modelAyari() {
  const d = dosyadanOku();
  const anahtarDegiskeni = process.env.AKREDDIT_ANAHTAR_DEGISKENI || d.anahtarDegiskeni || VARSAYILAN_ANAHTAR;
  const adres = (process.env.AKREDDIT_API_ADRESI || d.adres || "").replace(/\/$/, "");
  const model = process.env.AKREDDIT_MODEL || d.model || "";
  let dosyadaki = "";
  try { dosyadaki = readFileSync(ANAHTAR_DOSYASI, "utf8").trim(); } catch { /* anahtar yok */ }
  return { adres, model, anahtarDegiskeni, anahtar: process.env[anahtarDegiskeni] || dosyadaki };
}

export function ayarKaydet(ayar) {
  mkdirSync(AYAR_KLASORU, { recursive: true });
  writeFileSync(AYAR_DOSYASI, `${JSON.stringify({ ...dosyadanOku(), ...ayar }, null, 2)}\n`);
}

export function anahtarKaydet(anahtar) {
  mkdirSync(AYAR_KLASORU, { recursive: true, mode: 0o700 });
  writeFileSync(ANAHTAR_DOSYASI, `${anahtar.trim()}\n`, { mode: 0o600 });
  chmodSync(ANAHTAR_DOSYASI, 0o600);
}

export async function sohbetIstegi({ mesajlar, araclar, ayar = modelAyari() }) {
  const govde = { model: ayar.model, messages: mesajlar, temperature: 0.2 };
  if (araclar?.length) Object.assign(govde, { tools: araclar, tool_choice: "auto" });
  for (let deneme = 1; ; deneme++) {
    let yanit;
    try {
      yanit = await fetch(`${ayar.adres}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(ayar.anahtar ? { Authorization: `Bearer ${ayar.anahtar}` } : {}) },
        body: JSON.stringify(govde),
        signal: AbortSignal.timeout(10 * 60 * 1000),
      });
    } catch (e) {
      if (deneme < 3) { await new Promise((r) => setTimeout(r, 2000 * deneme)); continue; }
      throw new Error(`Model sunucusuna ulaşılamadı (${ayar.adres}): ${e.message}`);
    }
    if ((yanit.status === 429 || yanit.status >= 500) && deneme < 4) {
      const bekle = Number(yanit.headers.get("retry-after")) || 5 * deneme;
      await new Promise((r) => setTimeout(r, bekle * 1000));
      continue;
    }
    const metin = await yanit.text();
    if (yanit.status === 401 || yanit.status === 403) {
      throw new Error("Anahtar kabul edilmedi. Anahtarı eksiksiz kopyaladığından emin ol ve yeniden gir: akreddit kurulum");
    }
    if (!yanit.ok) throw new Error(`Model sunucusu ${yanit.status} döndü: ${metin.slice(0, 300)}`);
    const veri = JSON.parse(metin);
    const mesaj = veri.choices?.[0]?.message;
    if (!mesaj) throw new Error("Model sunucusu boş yanıt döndü.");
    return mesaj;
  }
}

function goster(ayar) {
  const y = (m) => process.stdout.write(`${m}\n`);
  y(`Adres: ${ayar.adres || "(ayarlanmadı)"}`);
  y(`Model: ${ayar.model || "(ayarlanmadı)"}`);
  y(`Anahtar: ${ayar.anahtar ? "kayıtlı" : "yok"} (${ayar.anahtarDegiskeni} ortam değişkeni ya da ${ANAHTAR_DOSYASI})`);
  y(`Ayar dosyası: ${AYAR_DOSYASI}`);
}

export async function modelKomutu(s) {
  const y = (m) => process.stdout.write(`${m}\n`);
  if (s.hazir && !HAZIRLAR[s.hazir]) {
    y(`Bilinmeyen hazır ayar: ${s.hazir}. Seçenekler: ${Object.keys(HAZIRLAR).join(", ")}`);
    process.exit(1);
  }
  const yeni = {
    ...dosyadanOku(),
    ...(s.hazir ? { adres: HAZIRLAR[s.hazir].adres, ...(HAZIRLAR[s.hazir].model ? { model: HAZIRLAR[s.hazir].model } : {}) } : {}),
    ...(typeof s.adres === "string" ? { adres: s.adres.replace(/\/$/, "") } : {}),
    ...(typeof s.model === "string" ? { model: s.model } : {}),
    ...(typeof s["anahtar-degiskeni"] === "string" ? { anahtarDegiskeni: s["anahtar-degiskeni"] } : {}),
  };
  if (s.hazir || s.adres || s.model || s["anahtar-degiskeni"]) {
    mkdirSync(AYAR_KLASORU, { recursive: true });
    writeFileSync(AYAR_DOSYASI, `${JSON.stringify(yeni, null, 2)}\n`);
    y("Model ayarı kaydedildi.");
  } else if (!existsSync(AYAR_DOSYASI) && !process.env.AKREDDIT_API_ADRESI) {
    y("Henüz model ayarı yok. En kolayı: akreddit kurulum");
    y("Elle ayarlamak için örnekler:");
    for (const [ad, h] of Object.entries(HAZIRLAR)) y(`  akreddit model --hazir ${ad} --model <model-adı>   ${h.aciklama}`);
    y("  akreddit model --adres https://sunucu/v1 --model <model-adı>   Başka bir OpenAI uyumlu sunucu");
    return;
  }
  const ayar = modelAyari();
  goster(ayar);
  if (s.dene) {
    if (!ayar.adres || !ayar.model) { y("Önce adres ve model ayarla."); process.exit(1); }
    const m = await sohbetIstegi({ mesajlar: [{ role: "user", content: "Yalnız 'hazır' yaz." }], ayar });
    y(`Deneme yanıtı: ${String(m.content ?? "").trim().slice(0, 80)}`);
  }
}
