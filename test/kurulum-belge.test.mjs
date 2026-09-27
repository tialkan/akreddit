// Kurulum sihirbazı ve belge okuyucu.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32 } from "node:zlib";
import { belgeMetni } from "../lib/belge.mjs";

const ARAC = fileURLToPath(new URL("../bin/akreddit", import.meta.url));
const EV = mkdtempSync(join(tmpdir(), "akreddit-kurulum-"));

const yetkiler = [];
const sunucu = createServer((req, res) => {
  let g = "";
  req.on("data", (p) => (g += p));
  req.on("end", () => {
    yetkiler.push(req.headers.authorization);
    const veri = JSON.parse(g);
    const mesaj = veri.tools
      ? { role: "assistant", content: null, tool_calls: [{ id: "1", type: "function", function: { name: "saat_kac", arguments: "{}" } }] }
      : { role: "assistant", content: "hazır" };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ choices: [{ message: mesaj }] }));
  });
});
await new Promise((r) => sunucu.listen(0, r));
after(() => { sunucu.close(); sunucu.closeAllConnections(); });

test("kurulum sihirbazı adresi, modeli ve anahtarı kaydeder, bağlantıyı dener", async () => {
  const adres = `http://127.0.0.1:${sunucu.address().port}/v1`;
  const cocuk = spawn(process.execPath, [ARAC, "kurulum"], { env: { ...process.env, XDG_CONFIG_HOME: EV, AKREDDIT_API_ADRESI: "", AKREDDIT_MODEL: "", AKREDDIT_API_ANAHTARI: "" } });
  let cikti = "";
  cocuk.stdout.on("data", (p) => (cikti += p));
  cocuk.stderr.on("data", (p) => (cikti += p));
  cocuk.stdin.end(`D\n${adres}\ndeneme-model\ngizli-123\n`);
  const kod = await new Promise((r) => cocuk.on("close", r));
  assert.equal(kod, 0, cikti);
  assert.match(cikti, /Bağlantı çalışıyor/);
  assert.match(cikti, /akreddit ajan/);
  assert.doesNotMatch(cikti, /araç kullanamıyor/);
  const ayar = JSON.parse(readFileSync(join(EV, "akreddit", "model.json"), "utf8"));
  assert.deepEqual(ayar, { adres, model: "deneme-model" });
  const anahtarDosyasi = join(EV, "akreddit", "anahtar");
  assert.equal(readFileSync(anahtarDosyasi, "utf8").trim(), "gizli-123");
  assert.equal(statSync(anahtarDosyasi).mode & 0o777, 0o600);
  assert.ok(yetkiler.every((y) => y === "Bearer gizli-123"));
});

/** Tek sayfalı, metin içeren en küçük PDF. */
function pdfUret(metin) {
  const nesneler = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    null,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const akis = `BT /F1 12 Tf 20 100 Td (${metin}) Tj ET`;
  nesneler[3] = `<< /Length ${akis.length} >>\nstream\n${akis}\nendstream`;
  let pdf = "%PDF-1.4\n";
  const konumlar = nesneler.map((n, i) => { const k = pdf.length; pdf += `${i + 1} 0 obj\n${n}\nendobj\n`; return k; });
  const xref = pdf.length;
  pdf += `xref\n0 ${nesneler.length + 1}\n0000000000 65535 f \n${konumlar.map((k) => `${String(k).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${nesneler.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

/** Sıkıştırmasız tek dosyalı ZIP (Word belgesi yerine). */
function zipUret(ad, icerik) {
  const veri = Buffer.from(icerik, "utf8");
  const adB = Buffer.from(ad);
  const crc = crc32(veri);
  const yerel = Buffer.alloc(30);
  yerel.writeUInt32LE(0x04034b50, 0); yerel.writeUInt16LE(20, 4); yerel.writeUInt32LE(crc, 14);
  yerel.writeUInt32LE(veri.length, 18); yerel.writeUInt32LE(veri.length, 22); yerel.writeUInt16LE(adB.length, 26);
  const merkez = Buffer.alloc(46);
  merkez.writeUInt32LE(0x02014b50, 0); merkez.writeUInt16LE(20, 4); merkez.writeUInt16LE(20, 6); merkez.writeUInt32LE(crc, 16);
  merkez.writeUInt32LE(veri.length, 20); merkez.writeUInt32LE(veri.length, 24); merkez.writeUInt16LE(adB.length, 28);
  const merkezKonum = 30 + adB.length + veri.length;
  const son = Buffer.alloc(22);
  son.writeUInt32LE(0x06054b50, 0); son.writeUInt16LE(1, 8); son.writeUInt16LE(1, 10);
  son.writeUInt32LE(46 + adB.length, 12); son.writeUInt32LE(merkezKonum, 16);
  return Buffer.concat([yerel, adB, veri, merkez, adB, son]);
}

test("PDF metni sayfa numarasıyla okunur", async () => {
  const yol = join(EV, "tutanak.pdf");
  writeFileSync(yol, pdfUret("Kurul toplantisi 12 Mart"));
  const { metin, uyari } = await belgeMetni(yol);
  assert.equal(uyari, undefined);
  assert.match(metin, /--- Sayfa 1 ---/);
  assert.match(metin, /Kurul toplantisi 12 Mart/);
});

test("Word belgesinin metni okunur", async () => {
  const yol = join(EV, "izlence.docx");
  writeFileSync(yol, zipUret("word/document.xml", "<w:document><w:body><w:p><w:r><w:t>Öğrenme çıktıları &amp; değerlendirme</w:t></w:r></w:p><w:p><w:r><w:t>İkinci paragraf</w:t></w:r></w:p></w:body></w:document>"));
  const { metin } = await belgeMetni(yol);
  assert.equal(metin, "Öğrenme çıktıları & değerlendirme\nİkinci paragraf");
});

test("okunamayan türler için yol gösterilir", async () => {
  const yol = join(EV, "tablo.xlsx");
  writeFileSync(yol, "x");
  assert.match((await belgeMetni(yol)).uyari, /CSV/);
});
