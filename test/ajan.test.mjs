// Ajan döngüsünü sahte bir OpenAI uyumlu sunucuyla dener. Ağ ve gerçek model gerekmez.
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ARAC = fileURLToPath(new URL("../bin/akreddit", import.meta.url));
const EV = mkdtempSync(join(tmpdir(), "akreddit-ajan-"));
const KLASOR = join(EV, "program");

let senaryo = [];
const istekler = [];
const sunucu = createServer((req, res) => {
  let govde = "";
  req.on("data", (p) => (govde += p));
  req.on("end", () => {
    const veri = JSON.parse(govde);
    istekler.push({ yol: req.url, yetki: req.headers.authorization, veri });
    const adim = senaryo.shift() ?? { content: "Bitti." };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ choices: [{ message: { role: "assistant", content: adim.content ?? null, tool_calls: adim.cagrilar } }] }));
  });
});
await new Promise((r) => sunucu.listen(0, r));
after(() => { sunucu.close(); sunucu.closeAllConnections(); });
const ADRES = `http://127.0.0.1:${sunucu.address().port}/v1`;

const cagri = (id, ad, arg) => ({ id, type: "function", function: { name: ad, arguments: JSON.stringify(arg) } });

function ajan(args, cwd = EV) {
  return new Promise((r) => execFile(process.execPath, [ARAC, "ajan", ...args], {
    cwd,
    env: { ...process.env, XDG_CONFIG_HOME: EV, AKREDDIT_API_ADRESI: ADRES, AKREDDIT_MODEL: "deneme", AKREDDIT_API_ANAHTARI: "gizli-anahtar" },
  }, (hata, stdout, stderr) => r({ kod: hata ? hata.code : 0, cikti: stdout, gunluk: stderr })));
}

test("model ayarı yoksa ajan yol gösterir", async () => {
  const r = await new Promise((ok) => execFile(process.execPath, [ARAC, "ajan", "--tek", "x"], { cwd: EV, env: { ...process.env, XDG_CONFIG_HOME: EV, AKREDDIT_API_ADRESI: "", AKREDDIT_MODEL: "" } },
    (h, o) => ok({ kod: h ? h.code : 0, cikti: o })));
  assert.equal(r.kod, 1);
  assert.match(r.cikti, /akreddit model --hazir vllm/);
});

test("ajan araçlarla klasör kurar ve rapor yazar", async () => {
  senaryo = [
    { cagrilar: [cagri("1", "komut_calistir", { argumanlar: ["kur", KLASOR] })] },
    { cagrilar: [cagri("2", "beceri_oku", { ad: "bologna" }), cagri("3", "dosya_yaz", { yol: "raporlar/plan.md", icerik: "# Plan\n" })] },
    { content: "Klasör hazır, plan yazıldı." },
  ];
  istekler.length = 0;
  const r = await ajan(["--tek", "Bilgisayar Programcılığı için klasör kur"]);
  assert.equal(r.kod, 0, r.gunluk);
  assert.match(r.cikti, /plan yazıldı/);
  assert.equal(readFileSync(join(KLASOR, "raporlar", "plan.md"), "utf8"), "# Plan\n");

  assert.equal(istekler[0].yol, "/v1/chat/completions");
  assert.equal(istekler[0].yetki, "Bearer gizli-anahtar");
  assert.equal(istekler[0].veri.model, "deneme");
  assert.ok(istekler[0].veri.tools.some((t) => t.function.name === "kullaniciya_sor"));
  assert.match(istekler[0].veri.messages[0].content, /Önce kendin çıkar, en son sor/);
  const beceriYaniti = istekler[2].veri.messages.find((m) => m.tool_call_id === "2").content;
  assert.match(beceriYaniti, /bologna-al/);

  const gunluk = readdirSync(join(KLASOR, "gunluk")).filter((d) => d.endsWith(".jsonl"));
  assert.match(readFileSync(join(KLASOR, "gunluk", gunluk[0]), "utf8"), /ajan_arac/);
});

test("ajan klasör dışına çıkamaz, kanıtlara yazamaz, onay veremez", async () => {
  senaryo = [
    {
      cagrilar: [
        cagri("1", "dosya_oku", { yol: "../../../etc/passwd" }),
        cagri("2", "dosya_yaz", { yol: "kanitlar/sahte.pdf", icerik: "x" }),
        cagri("3", "komut_calistir", { argumanlar: ["karar", "1", "onayla", "--onaylayan", "Model"] }),
        cagri("4", "komut_calistir", { argumanlar: ["ajan"] }),
        cagri("5", "kullaniciya_sor", { soru: "Hangisi?", secenekler: ["Önerilen", "Diğer"] }),
      ],
    },
    { content: "Tamam." },
  ];
  istekler.length = 0;
  const r = await ajan(["--tek", "dene"], KLASOR);
  assert.equal(r.kod, 0, r.gunluk);
  const yanit = (id) => istekler[1].veri.messages.find((m) => m.tool_call_id === id).content;
  assert.match(yanit("1"), /dışında/);
  assert.match(yanit("2"), /Yalnız raporlar/);
  assert.match(yanit("3"), /Gözetimsiz kipte onay verilemez/);
  assert.match(yanit("4"), /çalıştırılamaz/);
  assert.match(yanit("5"), /Önerilen/);
  assert.equal(existsSync(join(KLASOR, "kanitlar", "sahte.pdf")), false);
});
