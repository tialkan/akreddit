import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { taslakDenetle } from "../lib/bologna-taslak.mjs";

const ornek = () => JSON.parse(readFileSync(new URL("../bilgi/bologna-taslak-ornek.json", import.meta.url), "utf8"));
const hatalar = (t) => taslakDenetle(t).hatalar.join("\n");

test("örnek taslak temiz geçer", () => {
  assert.deepEqual(taslakDenetle(ornek()).hatalar, []);
});

test("K8 iş yükü AKTS × 30'a eşit olmalı", () => {
  const t = ornek();
  t.isyuku[0].sure = 2;
  assert.match(hatalar(t), /K8: Toplam iş yükü 136 saat/);
});

test("K4 ölçülemeyen çıktı yakalanır, -ebilir biçimi geçer", () => {
  const t = ornek();
  t.ciktilar[0].tr = "Web teknolojileri hakkında bilgi sahibi olur.";
  t.ciktilar[1].tr = "HTML5 ile erişilebilir sayfa yapısı tasarlayabilir.";
  const h = hatalar(t);
  assert.match(h, /K4: Ö1/);
  assert.doesNotMatch(h, /K4: Ö2/);
});

test("K5 kesintili numaralandırma ve eksik yetkinlik", () => {
  const t = ornek();
  t.ciktilar[2].kod = "Ö9";
  t.ciktilar.forEach((c) => { if (c.tur === "Yetkinlik") c.tur = "Beceri"; });
  const h = hatalar(t);
  assert.match(h, /K5: Çıktı numaralandırması kesintili/);
  assert.match(h, /En az bir çıktı Yetkinlik/);
});

test("K12 şişirilmiş matris ve programda olmayan sütun", () => {
  const t = ornek();
  for (const s of Object.values(t.katki)) for (const p of Object.keys(s)) s[p] = 5;
  t.katki["Ö1"].P99 = 3;
  const h = hatalar(t);
  assert.match(h, /şişirilmiş/);
  assert.match(h, /programda olmayan sütun: P99/);
});

test("Türkçe karakteri düşürülmüş metin ve eksik değerlendirme yakalanır", () => {
  const t = ornek();
  t.haftalar[0].onHazirlik = "Haftalik konu notlarini inceleyiniz.";
  t.degerlendirme.pop();
  const h = hatalar(t);
  assert.match(h, /Türkçe: .*[Hh]aftalik/);
  assert.match(h, /Katkılar toplamı %60/);
});
