// Çalıştır: node --test test/
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, statSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const ARAC = new URL("../bin/akreddit", import.meta.url).pathname;

const EV = mkdtempSync(join(tmpdir(), "akreddit-ev-"));

function calistir(args, cwd = EV) {
  return new Promise((r) => execFile(process.execPath, [ARAC, ...args], { cwd, env: { ...process.env, XDG_CONFIG_HOME: EV } },
    (hata, stdout, stderr) => r({ kod: hata ? hata.code : 0, cikti: stdout + stderr })));
}

test("klasör kurulur, kanıt tekrar eklenmez, adım günlüğü değiştirilemez", async () => {
  const klasor = join(EV, "program");
  assert.equal((await calistir(["kur", klasor])).kod, 0);
  for (const alt of ["kanitlar", "kayit", "gunluk", "raporlar", "tarayici"]) assert.ok(existsSync(join(klasor, alt)));

  const dosya = join(EV, "tutanak.pdf");
  writeFileSync(dosya, "%PDF-1.4 deneme");
  assert.match((await calistir(["kanit-ekle", dosya], klasor)).cikti, /Eklendi/);
  assert.match((await calistir(["kanit-ekle", dosya], klasor)).cikti, /Zaten var/);
  assert.equal(readdirSync(join(klasor, "kanitlar")).length, 1);
  assert.equal(statSync(join(klasor, "kanitlar", readdirSync(join(klasor, "kanitlar"))[0])).mode & 0o222, 0, "kanıt salt okunur olmalı");

  await calistir(["adim", "oneri", "--ayrinti", "{\"x\":1}", "--onaylayan", "hoca"], klasor);
  const ozet = await calistir(["ozet"], klasor);
  assert.match(ozet.cikti, /Kanıt: 1 dosya/);
  assert.match(ozet.cikti, /oneri/);

  const vt = new DatabaseSync(join(klasor, "kayit", "akreddit.sqlite"));
  assert.throws(() => vt.exec("DELETE FROM adimlar"), /silinemez/);
  vt.close();
  assert.ok(readdirSync(join(klasor, "gunluk")).some((d) => d.endsWith(".jsonl")));
});

test("Faz 4: çıktı, öneri, karar, matris ve rapor denetimi", async () => {
  const k = join(EV, "program");
  const c = (...a) => calistir(a, k);
  const kanitKod = (await c("kanitlar")).cikti.match(/K:([0-9a-f]{8})/)[1];

  assert.equal((await c("cikti-ekle", "--tur", "program", "--kod", "PÇ1", "--metin", "Algoritma tasarlar ve uygular.")).kod, 0);
  assert.equal((await c("cikti-ekle", "--tur", "program", "--kod", "PÇ2", "--metin", "Etik ilkelere uygun davranır.")).kod, 0);
  assert.equal((await c("cikti-ekle", "--tur", "ders", "--ders", "TBP201", "--kod", "DÇ1", "--metin", "Web sayfası tasarlar.")).kod, 0);
  assert.match((await c("cikti-ekle", "--tur", "program", "--kod", "PÇ1", "--metin", "Başka bir metin burada.")).cikti, /yeni kodla/);

  // 0 puan ve kayıtsız çıktı reddedilir.
  assert.match((await c("oner-matris", "--ders-cikti", "TBP201.DÇ1", "--program-cikti", "PÇ1", "--puan", "0", "--gerekce", "Deneme gerekçesi burada.")).cikti, /0 yazma/);
  assert.match((await c("oner-matris", "--ders-cikti", "TBP201.DÇ9", "--program-cikti", "PÇ1", "--puan", "2", "--gerekce", "Deneme gerekçesi burada.")).cikti, /kayıtlı değil/);

  // Kanıtsız 4 puan inceleme notu alır.
  const o1 = await c("oner-matris", "--ders-cikti", "TBP201.DÇ1", "--program-cikti", "PÇ1", "--puan", "4", "--gerekce", "Proje ödevi doğrudan ölçüyor.");
  assert.match(o1.cikti, /ölçme planından/);
  const id1 = o1.cikti.match(/#(\d+)/)[1];
  const o2 = await c("oner-matris", "--ders-cikti", "TBP201.DÇ1", "--program-cikti", "PÇ2", "--iliskisiz", "--gerekce", "İzlencede etik konusu geçmiyor.", "--kanit", kanitKod);
  assert.match(o2.cikti, /#\d+/, o2.cikti);
  const id2 = o2.cikti.match(/#(\d+)/)[1];

  // Karar insan adı olmadan verilmez, bir kez verilir.
  assert.match((await c("karar", id1, "onayla")).cikti, /yapay zekâ veremez/);
  assert.equal((await c("karar", id1, "duzelt", "--puan", "3", "--onaylayan", "Deneme Hoca")).kod, 0);
  assert.match((await c("karar", id1, "onayla", "--onaylayan", "Deneme Hoca")).cikti, /zaten karar/);
  assert.equal((await c("karar", id2, "onayla", "--onaylayan", "Deneme Hoca")).kod, 0);

  const m = await c("matris", "--csv");
  assert.match(m.cikti, /\| TBP201\.DÇ1 \| 3 \| · \|/);
  assert.match(readFileSync(join(k, "raporlar", "matris.csv"), "utf8"), /TBP201\.DÇ1,3,iliskisiz/);

  // Rapor denetimi: geçerli kaynak geçer, uydurma kaynak hata verir, kaynaksız sayı uyarı alır.
  writeFileSync(join(k, "raporlar", "iyi.md"), `# Bölüm\n\nKurul toplantı yaptı [K:${kanitKod} s. 1].\n\nAnket yapılmadı [EKSİK: mezun anketi].\n`);
  const iyi = await c("rapor-denetle", join(k, "raporlar", "iyi.md"));
  assert.equal(iyi.kod, 0, iyi.cikti);
  assert.match(iyi.cikti, /mezun anketi/);
  writeFileSync(join(k, "raporlar", "kotu.md"), "Öğrencilerin yüzde 87'si başarılı oldu.\n\nToplantı yapıldı [K:deadbeef].\n");
  const kotu = await c("rapor-denetle", join(k, "raporlar", "kotu.md"));
  assert.equal(kotu.kod, 1);
  assert.match(kotu.cikti, /hiçbir kanıta karşılık gelmiyor/);
  assert.match(kotu.cikti, /sayı içeriyor/);

  const vt = new DatabaseSync(join(k, "kayit", "akreddit.sqlite"));
  assert.throws(() => vt.exec("UPDATE oneriler SET son_puan = 5"), /değiştirilemez/);
  assert.throws(() => vt.exec("DELETE FROM kanitlar"), /silinemez/);
  vt.close();
});

test("Faz 3 klasörü yeni şemaya geçer", async () => {
  const eski = join(EV, "eski");
  for (const alt of ["kanitlar", "kayit", "gunluk", "raporlar"]) mkdirSync(join(eski, alt), { recursive: true });
  writeFileSync(join(eski, "AKREDDIT.md"), "eski");
  const vt = new DatabaseSync(join(eski, "kayit", "akreddit.sqlite"));
  vt.exec("CREATE TABLE kanitlar (id INTEGER PRIMARY KEY, ozet TEXT NOT NULL UNIQUE, ozgun_ad TEXT NOT NULL, yol TEXT NOT NULL UNIQUE, boyut INTEGER NOT NULL, eklenme TEXT NOT NULL) STRICT; CREATE TABLE adimlar (id INTEGER PRIMARY KEY, zaman TEXT NOT NULL, eylem TEXT NOT NULL, adres TEXT, ayrinti TEXT, ekran TEXT, onaylayan TEXT) STRICT;");
  vt.close();
  const r = await calistir(["cikti-ekle", "--tur", "program", "--kod", "PÇ1", "--metin", "Eski klasörde çıktı."], eski);
  assert.equal(r.kod, 0, r.cikti);
});

test("Faz 5: yazma planı ve tarayıcı koruması", async () => {
  const k = join(EV, "program");
  const c = (...a) => calistir(a, k);
  const kancaYolu = new URL("../scripts/koruma.mjs", import.meta.url).pathname;
  const kanca = (arac, girdi = {}, mod = "default") => new Promise((r) => {
    const p = execFile(process.execPath, [kancaYolu], (h, out) => {
      const karar = out ? JSON.parse(out).hookSpecificOutput : null;
      r({ kod: h ? h.code : 0, karar: karar?.permissionDecision ?? "izin", neden: karar?.permissionDecisionReason ?? "" });
    });
    p.stdin.end(JSON.stringify({ tool_name: `mcp__plugin_akreddit_tarayici__browser_${arac}`, tool_input: girdi, cwd: k, permission_mode: mod }));
  });
  const kanitKod = (await c("kanitlar")).cikti.match(/K:([0-9a-f]{8})/)[1];

  // Okuma serbest, tehlikeli araçlar hep kapalı.
  assert.equal((await kanca("navigate", { url: "https://obs.ornek.edu.tr" })).karar, "izin");
  assert.equal((await kanca("snapshot")).karar, "izin");
  for (const arac of ["cookie_get", "run_code_unsafe", "press_key", "file_upload", "gelecekte_eklenen"]) assert.equal((await kanca(arac)).karar, "deny", arac);

  // Plan yokken yazma reddedilir.
  assert.match((await kanca("type", { element: "Ders saati", text: "3" })).neden, /yazma planı yok/);

  // Kaynağı olmayan ya da giriş bilgisi içeren plan açılamaz.
  assert.match((await c("yazma-plani", "--sistem", "Bologna", "--adres", "https://obs", "--alanlar", JSON.stringify([{ alan: "AKTS", mevcut: "4", yeni: "5", kaynak: "tahmin" }]))).cikti, /kaynak/);
  assert.match((await c("yazma-plani", "--sistem", "Bologna", "--adres", "https://obs", "--alanlar", JSON.stringify([{ alan: "Parola", mevcut: "", yeni: "x", kaynak: `K:${kanitKod}` }]))).cikti, /giriş bilgisi/);

  const plan = await c("yazma-plani", "--sistem", "Bologna", "--adres", "https://obs/ders/TBP201", "--alanlar",
    JSON.stringify([{ alan: "Öğrenme çıktısı 1", mevcut: "", yeni: "Web sayfası tasarlar.", kaynak: `K:${kanitKod} s. 2` }]));
  assert.match(plan.cikti, /\| Öğrenme çıktısı 1 \| \(boş\) \| Web sayfası tasarlar\. \|/);
  const planId = plan.cikti.match(/planı #(\d+)/)[1];
  // Onaylanmamış plan yazma izni vermez.
  assert.equal((await kanca("type", { element: "Öğrenme çıktısı 1", text: "Web sayfası tasarlar." })).karar, "deny");
  assert.equal((await c("yazma-onay", planId, "--onaylayan", "Deneme Hoca")).kod, 0);

  // Onaylı planla: plandaki değer sorulur, dışındaki reddedilir.
  const sor = await kanca("type", { element: "Öğrenme çıktısı 1", text: "Web sayfası tasarlar." });
  assert.equal(sor.karar, "ask");
  assert.match(sor.neden, /plan #\d+/);
  assert.match((await kanca("type", { element: "Öğrenme çıktısı 1", text: "Uydurma değer" })).neden, /Plan #\d+ dışında/);
  assert.equal((await kanca("fill_form", { fields: [{ name: "ÖÇ1", value: "Web sayfası tasarlar." }] })).karar, "ask");
  assert.equal((await kanca("type", { element: "Öğrenme çıktısı 1", text: "Web sayfası tasarlar.", submit: true })).karar, "deny");
  // Tam yetki modunda soru sorulmaz ama plan ve değer denetimi sürer.
  assert.equal((await kanca("type", { element: "Öğrenme çıktısı 1", text: "Web sayfası tasarlar." }, "bypassPermissions")).karar, "allow");
  assert.equal((await kanca("type", { element: "Öğrenme çıktısı 1", text: "Uydurma değer" }, "bypassPermissions")).karar, "deny");
  assert.equal((await kanca("click", { element: "Onaya Gönder" }, "auto")).karar, "deny");
  assert.match((await kanca("type", { element: "Kullanıcı şifresi", text: "Web sayfası tasarlar." })).neden, /giriş bilgisi/);

  // Düğmeler: gönderim hep kapalı, gezinme serbest, kaydet sorulur.
  assert.equal((await kanca("click", { element: "Onaya Gönder düğmesi" })).karar, "deny");
  assert.equal((await kanca("click", { element: "Ders Bilgileri sekmesi" })).karar, "izin");
  assert.equal((await kanca("click", { element: "Kaydet düğmesi" })).karar, "ask");

  // Kapanan plan yeniden açılamaz, sonrasında yazma reddedilir.
  assert.equal((await c("yazma-bitir", planId, "tamamlandi", "--sonuc", "Bologna güncellendi")).kod, 0);
  assert.match((await c("yazma-onay", planId, "--onaylayan", "Deneme Hoca")).cikti, /onay bekleyen/);
  assert.equal((await kanca("type", { element: "Öğrenme çıktısı 1", text: "Web sayfası tasarlar." })).karar, "deny");
  const vt = new DatabaseSync(join(k, "kayit", "akreddit.sqlite"));
  assert.throws(() => vt.exec("UPDATE yazma_planlari SET durum = 'onaylandi'"), /değiştirilemez/);
  vt.close();
  assert.ok(readFileSync(join(k, "gunluk", `${new Date().toISOString().slice(0, 10)}.jsonl`), "utf8").includes("tarayici_yazma_istegi"));
});

test("Faz 6: pilot raporu", async () => {
  const k = join(EV, "program");
  const r = await calistir(["pilot-raporu", "--eski-saat", "40"], k);
  assert.equal(r.kod, 0, r.cikti);
  assert.match(r.cikti, /Çalışma oturumu: 1/);
  assert.match(r.cikti, /Düzeltilen: 1/);
  assert.match(r.cikti, /İnsan süresindeki azalma: %\d+/);
  assert.match(r.cikti, /Yazma planı: \d+ \(tamamlanan 1/);
  assert.ok(existsSync(join(k, "raporlar", "pilot-raporu.md")));
});

test("büyük yazma planı (bütün ders sayfası) kabul edilir", async () => {
  const k = join(EV, "program");
  const kanitKod = (await calistir(["kanitlar"], k)).cikti.match(/K:([0-9a-f]{8})/)[1];
  const alanlar = Array.from({ length: 150 }, (_, i) => ({ alan: `Hafta ${i}`, mevcut: "", yeni: `Konu ${i}`, kaynak: `K:${kanitKod}` }));
  const r = await calistir(["yazma-plani", "--sistem", "OBS", "--adres", "https://obs/ders", "--alanlar", JSON.stringify(alanlar)], k);
  assert.equal(r.kod, 0, r.cikti.slice(0, 300));
  const id = r.cikti.match(/planı #(\d+)/)[1];
  assert.match((await calistir(["yazma-onay", id, "--onaylayan", "Deneme Hoca", "--sure", "500"], k)).cikti, /120 dakika/);
  await calistir(["yazma-bitir", id, "iptal", "--sonuc", "test"], k);
});
