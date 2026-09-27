// Akreddit tarayıcı koruması (Claude Code PreToolUse kancası).
//
// Okuma: serbest. Yazma ("Kaydet" tıklaması dahil): onaylı ve süresi dolmamış bir yazma planı
// gerekir, yalnız plandaki değerler yazılabilir ve her işlemde Claude Code kullanıcıya ayrıca
// izin sorar. Tam yetki ve otomatik modda Claude Code soru sormaz; kullanıcı bu modu seçerek
// yapay zekâya güvendiğini belirtmiştir. Plan ve değer denetimi her modda aynen çalışır.
// Her zaman kapalı: parola alanları, dış kuruma son gönderim düğmeleri, tuşa basma, çerez,
// depolama, ağ, sayfada kod çalıştırma, dosya yükleme ve listede olmayan her araç.
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const OKUMA = /^(navigate|navigate_back|snapshot|take_screenshot|hover|wait_for|tabs|close|resize|find|verify_[a-z_]+|pdf_save|mouse_wheel)$/;
const YAZMA = /^(type|fill_form|select_option)$/;
const SON_GONDERIM = /g[öo]nder|onayla|onaya\s*sun|\bsun\b|kesinle[şs]tir|tamamla|submit|send|finali[sz]e|imzala|başvur/i;
const KAYDET = /kaydet|g[üu]ncelle|save|update|uygula|ekle/i;
const GIRIS_BILGISI = /parola|[şs]ifre|password|passwd|pin\b|do[ğg]rulama kodu|otp|tek kullan[ıi]ml[ıi]k/i;
const IZIN_SORMAYAN_MODLAR = new Set(["bypassPermissions", "dontAsk", "auto"]);

function yanit(karar, neden) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: karar, permissionDecisionReason: neden },
  }));
  process.exit(0);
}
const reddet = (neden) => yanit("deny", `Akreddit: ${neden}`);

function klasorBul(baslangic) {
  let k = resolve(baslangic || process.cwd());
  while (true) {
    if (existsSync(join(k, "AKREDDIT.md")) && existsSync(join(k, "kayit", "akreddit.sqlite"))) return k;
    const ust = dirname(k);
    if (ust === k) return null;
    k = ust;
  }
}

async function aktifPlan(klasor) {
  const { DatabaseSync } = await import("node:sqlite");
  const vt = new DatabaseSync(join(klasor, "kayit", "akreddit.sqlite"));
  try {
    return vt.prepare("SELECT id, alanlar FROM yazma_planlari WHERE durum = 'onaylandi' AND son_kullanma > ? ORDER BY id DESC LIMIT 1")
      .get(new Date().toISOString()) ?? null;
  } catch {
    return null;
  } finally {
    vt.close();
  }
}

function gunlugeYaz(klasor, kayit) {
  mkdirSync(join(klasor, "gunluk"), { recursive: true });
  const zaman = new Date().toISOString();
  appendFileSync(join(klasor, "gunluk", `${zaman.slice(0, 10)}.jsonl`), `${JSON.stringify({ zaman, ...kayit })}\n`);
}

let girdi = "";
process.stdin.on("data", (p) => (girdi += p));
process.stdin.on("end", async () => {
  let g = {};
  try { g = JSON.parse(girdi); } catch { /* boş girdi */ }
  const tam = String(g.tool_name || "");
  if (!tam.includes("__browser_")) process.exit(0);
  const arac = tam.split("__browser_").pop();
  const girdiler = g.tool_input || {};
  const hedefMetni = [girdiler.element, ...(girdiler.fields || []).map((f) => f.name)].filter(Boolean).join(" ");

  if (OKUMA.test(arac)) process.exit(0);

  if (arac === "click") {
    if (SON_GONDERIM.test(hedefMetni)) return reddet(`"${girdiler.element}" dış kuruma giden son adım olabilir. Bu düğmeye kullanıcı kendisi basar.`);
    if (!KAYDET.test(hedefMetni)) process.exit(0); // gezinme tıklaması
  } else if (!YAZMA.test(arac)) {
    return reddet(`"${arac}" aracı kapalı. Tarayıcıda yalnız okuma ve onaylı alan doldurma yapılır.`);
  }

  if (GIRIS_BILGISI.test(hedefMetni)) return reddet("Bu bir giriş bilgisi alanı. Parolayı ve doğrulama kodunu yalnız kullanıcı kendisi yazar.");
  if (arac === "type" && girdiler.submit) return reddet("Yazıp Enter ile göndermek kapalı. Önce yaz, kaydetme adımını ayrı yap.");

  const klasor = klasorBul(g.cwd);
  if (!klasor) return reddet("Bir Akreddit çalışma klasöründe değilsin.");
  const plan = await aktifPlan(klasor);
  if (!plan) return reddet("Onaylı ve süresi dolmamış bir yazma planı yok. Önce akreddit yazma-plani ile tabloyu hazırla, kullanıcıya göster, onayını al.");

  const alanlar = JSON.parse(plan.alanlar);
  const izinli = new Set(alanlar.map((a) => String(a.yeni).trim()));
  const degerler = arac === "type" ? [girdiler.text]
    : arac === "fill_form" ? (girdiler.fields || []).map((f) => f.value)
    : arac === "select_option" ? (girdiler.values || [])
    : [];
  const disarida = degerler.map((d) => String(d ?? "").trim()).filter((d) => !izinli.has(d));
  if (disarida.length) {
    return reddet(`Plan #${plan.id} dışında değer: ${disarida.map((d) => `"${d.slice(0, 60)}"`).join(", ")}. Yalnız onaylı tablodaki değerler yazılır.`);
  }

  gunlugeYaz(klasor, { eylem: "tarayici_yazma_istegi", arac, plan: plan.id, mod: g.permission_mode, hedef: hedefMetni.slice(0, 200), degerler });
  const ozet = arac === "click"
    ? `"${girdiler.element}" düğmesine basılacak`
    : `${degerler.map((d) => `"${String(d).slice(0, 80)}"`).join(", ")} yazılacak`;
  const karar = IZIN_SORMAYAN_MODLAR.has(g.permission_mode) ? "allow" : "ask";
  return yanit(karar, `Akreddit plan #${plan.id}: ${ozet} (${hedefMetni.slice(0, 120)}). Ekrandaki alanın doğru olduğunu kontrol edip onayla.`);
});
