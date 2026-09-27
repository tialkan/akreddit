// Çalıştır: node --test test/  (internete çıkmaz)
import { test } from "node:test";
import assert from "node:assert/strict";
import { denetle, dersSayfasiCoz, metin, tablolar } from "../lib/bologna.mjs";

const hucre = (x) => `<td data-label="&lt;b>No&lt;/b>" onclick="if(a>b){x()}">${x}</td>`;
const tablo = (satirlar) => `<table>${satirlar.map((r) => `<tr>${r.map(hucre).join("")}</tr>`).join("")}</table>`;

test("öznitelikte > olan hücreler ve sayısal karakter kodları doğru çözülür", () => {
  const t = tablolar(tablo([["Sıra No", "A&#231;ıklama"], ["1", "Web&#39;in çalışmasını açıklar."]]));
  assert.deepEqual(t[0][1], ["1", "Web'in çalışmasını açıklar."]);
  assert.equal(metin("<b>G&#252;ncelleme</b>&nbsp;x"), "Güncelleme x");
});

const dersHtml = [
  tablo([["Yarıyıl", "Kodu", "Adı", "T+U+L", "Kredi", "AKTS", "Son Güncelleme Tarihi"], ["3", "TBP201", "İNTERNET PROGRAMLAMA", "2+1+0", "0", "5", "19.09.2026"]]),
  tablo([["Dersin Dili", "Türkçe"]]),
  tablo([["Yarıyıl Çalışmaları", "Sayısı", "Katkı"], ["Ara Sınav", "1", "% 40"], ["Yarıyıl Sonu Sınavı", "1", "% 50"], ["Toplam :", "2", "% 100"]]),
  tablo([["İş Yükü", "Sayısı", "Süre", "Toplam İş Yükü (Saat)"], ["Ders Süresi", "14", "3", "42"], ["Ödevler", "14", "3", "42"], ["AKTS Kredisi : 3", "", "", "3"]]),
  tablo([["Sıra No", "Açıklama"], ["1", "HTML sayfası tasarlar."], ["2", "CSS uygular."]]),
  tablo([["Hafta", "Konu"], ...Array.from({ length: 14 }, (_, i) => [String(i + 1), `Konu ${i + 1}`])]),
  tablo([["", "P1", "P2"], ["Tüm", "4", "2"], ["Ö1", "3", "2"], ["Be2", "3", "1"], ["Ye3", "2", "1"]]),
].join("");

test("ders sayfası ayrıştırılır, toplam satırları iş yüküne katılmaz", () => {
  const d = dersSayfasiCoz(dersHtml);
  assert.equal(d.kod, "TBP201");
  assert.equal(d.akts, 5);
  assert.equal(d.kredi, 0);
  assert.equal(d.degerlendirme.length, 2);
  assert.equal(d.isyuku.reduce((t, x) => t + x.toplam, 0), 84);
  assert.equal(d.ciktilar[1].kod, "Ö2");
  assert.equal(d.haftalar, 14);
  assert.equal(d.katki["Tüm"].P1, "4");
  assert.equal(d.katki["Ö2"].P1, "3", "Be2 satırı Ö2 sayılır");
  assert.ok(d.katki["Ö3"], "Ye3 satırı Ö3 sayılır");
});

test("denetim kuralları", () => {
  const d = { ...dersSayfasiCoz(dersHtml), zorunlu: true };
  const veri = {
    programCiktilari: [{ kod: "P1", metin: "a" }, { kod: "P2", metin: "b" }],
    tyycIsaret: 0,
    matris: { pkodlar: ["P1", "P2"], dersler: [
      { kod: "TBP201", zorunlu: true, degerler: { P1: "3", P2: "2" } },
      { kod: "TBP999", zorunlu: true, degerler: { P1: "-", P2: "" } },
      { kod: "OSD101", zorunlu: false, degerler: { P1: "", P2: "" } },
    ] },
    dersler: [d, { kod: "OSD101", zorunlu: false, bos: true }],
  };
  const b = denetle(veri);
  const kural = (k, ders) => b.find((x) => x.kural === k && (!ders || x.ders === ders));
  assert.ok(kural("tyyc"));
  assert.equal(kural("matris-bos", "TBP999").duzey, "hata");
  assert.equal(kural("bos-sayfa", "OSD101").duzey, "uyari");
  assert.match(kural("akts-isyuku", "TBP201").aciklama, /16\.8 saat/);
  assert.match(kural("degerlendirme", "TBP201").aciklama, /%90/);
  assert.ok(kural("kredi", "TBP201"));
  assert.match(kural("matris-tutarlilik", "TBP201").aciklama, /P1 4\/3/);
  assert.match(kural("katki-destegi", "TBP201").aciklama, /P1 \(genel 4, en yüksek 3\)/);
  assert.equal(b.filter((x) => x.ders === "OSD101").length, 1, "boş sayfa tek bulgu üretir");
  assert.match(b.find((x) => x.kural === "ders-ciktisi" && x.ders === "TBP201").aciklama, /Ö3 öğrenme çıktıları listesinde görünmüyor/);
});
