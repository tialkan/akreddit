// Bologna Bilgi Paketi (Proliz OBS) okuyucu ve denetleyici.
// Yalnız herkese açık sayfaları okur, giriş gerekmez. Sunucuyu yormamak için istekler sıralı ve aralıklıdır.

const VARLIKLAR = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const ETIKET = /<(?:[^>"']|"[^"]*"|'[^']*')*>/g;

export function metin(html) {
  return html
    .replace(/<(script|style)\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(ETIKET, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, a) => VARLIKLAR[a.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

/** Sayfadaki en içteki tabloları satır ve hücre dizisine çevirir. */
export function tablolar(html) {
  const temiz = html.replace(/<(script|style)\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1>/gi, "");
  const sonuc = [];
  const re = /<table\b(?:[^>"']|"[^"]*"|'[^']*')*>((?:(?!<table\b)[\s\S])*?)<\/table>/gi;
  let m;
  while ((m = re.exec(temiz))) {
    const satirlar = [...m[1].matchAll(/<tr\b(?:[^>"']|"[^"]*"|'[^']*')*>([\s\S]*?)<\/tr>/gi)]
      .map((r) => [...r[1].matchAll(/<t[dh]\b(?:[^>"']|"[^"]*"|'[^']*')*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => metin(c[1])));
    if (satirlar.some((s) => s.length)) sonuc.push(satirlar);
  }
  return sonuc;
}

const sayi = (s) => {
  const m = String(s ?? "").replace(",", ".").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

/** Program adresinden taban adresi ve program kimliğini çıkarır. */
export function adresCoz(adres) {
  const u = new URL(adres);
  const sunit = u.searchParams.get("curSunit");
  const i = u.pathname.toLowerCase().indexOf("/bologna/");
  if (!sunit || i < 0) throw new Error("Bologna program adresi bekleniyor (içinde /bologna/ ve curSunit olmalı).");
  return { taban: `${u.origin}${u.pathname.slice(0, i + 9)}`, sunit, dil: u.searchParams.get("lang") || "tr" };
}

async function sayfa(taban, yol, aralikMs) {
  await bekle(aralikMs);
  const y = await fetch(taban + yol, { headers: { "User-Agent": "Akreddit (akreditasyon hazirligi; salt okuma)" }, signal: AbortSignal.timeout(20000) });
  if (!y.ok) throw new Error(`${yol}: HTTP ${y.status}`);
  return y.text();
}

function programCiktilari(html) {
  const t = tablolar(html).find((t) => /Program Öğrenme Çıktıları|Program Outcomes/i.test(t[0]?.join(" ") ?? ""));
  if (!t) return [];
  return t.slice(1).filter((r) => r.length >= 2 && sayi(r[0]) !== null).map((r) => ({ kod: `P${sayi(r[0])}`, metin: r[1] }));
}

function programMatrisi(html) {
  const satirlar = tablolar(html).flat();
  const baslik = satirlar.find((r) => r.includes("Ders Kodu") && r.some((h) => /^P\d+$/.test(h)));
  if (!baslik) return { pkodlar: [], dersler: [] };
  const pBas = baslik.findIndex((h) => /^P\d+$/.test(h));
  const pkodlar = baslik.slice(pBas);
  let yariyil = null;
  const dersler = [];
  for (const r of satirlar) {
    if (r.length === 1 && /Yarıyıl|Semester/i.test(r[0])) { yariyil = sayi(r[0]); continue; }
    if (r.length < pBas + 1 || r === baslik || r[0] === "Ders Kodu") continue;
    const kod = r[0].replace(/^\[G\]\s*/, "");
    if (!/^[A-ZÇĞİÖŞÜ]{2,}\s*\d/.test(kod)) continue;
    dersler.push({
      kod, ad: r[1], zorunlu: /Zorunlu|Compulsory/i.test(r[2]), grup: r[3] || null, yariyil, grupBasligi: r[0].startsWith("[G]"),
      degerler: Object.fromEntries(pkodlar.map((p, i) => [p, r[pBas + i] ?? ""])),
    });
  }
  return { pkodlar, dersler };
}

function dersKimlikleri(html) {
  const kimlik = {};
  for (const tr of html.split(/<tr\b/i).slice(1)) {
    const id = tr.match(/prolizOpenCourseDetails\('?(\d+)/);
    const kod = metin(tr).match(/\b([A-ZÇĞİÖŞÜ]{2,}\s?\d{3}[A-Z]?)\b/);
    if (id && kod && !kimlik[kod[1]]) kimlik[kod[1]] = id[1];
  }
  return kimlik;
}

export function dersSayfasiCoz(html) {
  const t = tablolar(html);
  const bul = (re) => t.find((x) => re.test((x[0] ?? []).join(" ")));
  const ust = bul(/Yarıyıl.*Kodu|Semester.*Code/i);
  const [yariyil, kod, ad, tul, kredi, akts, guncelleme] = ust?.[1] ?? [];
  const bilgiler = Object.fromEntries((bul(/Dersin Dili|Language/i) ?? []).filter((r) => r.length >= 2).map((r) => [r[0], r[1]]));
  const degerlendirme = (bul(/Yarıyıl Çalışmaları|Term Studies/i) ?? []).slice(1)
    .filter((r) => r.length >= 3 && !/Toplam|Total/i.test(r[0])).map((r) => ({ ad: r[0], sayi: sayi(r[1]), katki: sayi(r[2]) }));
  const isyukuTablosu = bul(/İş Yükü|Workload/i) ?? [];
  const isyuku = isyukuTablosu.slice(1).filter((r) => r.length >= 4 && sayi(r[3]) !== null && !/Toplam|Total|AKTS|ECTS/i.test(r[0])).map((r) => ({ ad: r[0], sayi: sayi(r[1]), sure: sayi(r[2]), toplam: sayi(r[3]) }));
  const dersYapisi = (t.find((x) => x.some((r) => /Alan Bilgisi|Field/i.test(r[0] ?? ""))) ?? []).filter((r) => r.length >= 2 && /%/.test(r[1])).map((r) => ({ alan: r[0], yuzde: sayi(r[1]) }));
  const ciktiTablosu = bul(/Sıra No|No.*A[cç]ıklama|Description/i) ?? [];
  const ciktilar = ciktiTablosu.slice(1).filter((r) => r.length >= 2 && sayi(r[0]) !== null && r[1]).map((r) => ({ kod: `Ö${sayi(r[0])}`, metin: r[1] }));
  const haftalar = (bul(/Hafta|Week/i) ?? []).slice(1).filter((r) => sayi(r[0]) !== null && r[1]).length;
  // Katkı satırları "Ö3" ya da çıktının türüne göre "Bi3" (bilgi), "Be3" (beceri), "Ye3" (yetkinlik) diye adlandırılır.
  const katkiTablosu = t.find((x) => (x[0] ?? []).some((h) => /^P\d+$/.test(h)) && x.some((r) => /^(Tüm|All|Ö\d+|Bi\d+|Be\d+|Ye\d+)$/.test(r[0] ?? "")));
  const katki = {};
  if (katkiTablosu) {
    const pk = katkiTablosu[0].slice(1);
    for (const r of katkiTablosu.slice(1)) {
      if (!r[0]) continue;
      const ad = /^(Ö|Bi|Be|Ye)\d+$/.test(r[0]) ? `Ö${sayi(r[0])}` : r[0];
      katki[ad] = Object.fromEntries(pk.map((p, i) => [p, r[i + 1] ?? ""]));
    }
  }
  return { yariyil: sayi(yariyil), kod, ad, tul, kredi: sayi(kredi), akts: sayi(akts), guncelleme, bilgiler, degerlendirme, isyuku, dersYapisi, ciktilar, haftalar, katki };
}

/**
 * TYYÇ matrisinde program çıktısı sütunlarındaki dolu hücreleri sayar.
 * Satırlar "etiket, alt no, P1..Pn, alt no, etiket" ya da etiketsiz "alt no, P1..Pn, alt no" biçimindedir.
 */
function tyycIsaretSayisi(html, pSayisi) {
  if (!pSayisi) return null;
  let dolu = 0;
  for (const r of tablolar(html).flat()) {
    const ic = r.length === pSayisi + 4 ? r.slice(2, 2 + pSayisi) : r.length === pSayisi + 2 ? r.slice(1, 1 + pSayisi) : null;
    if (ic) dolu += ic.filter((h) => h && h !== "-").length;
  }
  return dolu;
}

/** Programın bütün Bologna verisini okur. */
export async function programiOku(adres, { dersler: istenen = null, aralikMs = 350, ilerleme = () => {} } = {}) {
  const { taban, sunit, dil } = adresCoz(adres);
  const q = `lang=${dil}&curSunit=${sunit}`;
  ilerleme("Program çıktıları okunuyor");
  const pc = programCiktilari(await sayfa(taban, `progLearnOutcomes.aspx?${q}`, 0));
  ilerleme("Ders-program çıktısı matrisi okunuyor");
  const matris = programMatrisi(await sayfa(taban, `progCourseMatrix.aspx?${q}`, aralikMs));
  const tyyc = tyycIsaretSayisi(await sayfa(taban, `progTYYCMatrix.aspx?${q}`, aralikMs), pc.length);
  const kimlikler = dersKimlikleri(await sayfa(taban, `progCourses.aspx?${q}`, aralikMs));
  const hedef = matris.dersler.filter((d) => !d.grupBasligi && kimlikler[d.kod] && (!istenen || istenen.includes(d.kod)));
  const dersler = [];
  for (const [i, d] of hedef.entries()) {
    ilerleme(`Ders ${i + 1}/${hedef.length}: ${d.kod}`);
    try {
      const html = await sayfa(taban, `progCourseDetails.aspx?curCourse=${kimlikler[d.kod]}&lang=${dil}`, aralikMs);
      const c = dersSayfasiCoz(html);
      dersler.push({
        ...c, kod: c.kod || d.kod, ad: c.ad || d.ad, zorunlu: d.zorunlu,
        bos: !c.kod && /Kayıt Yok|No Record/i.test(metin(html)),
        kaynak: `${taban}progCourseDetails.aspx?curCourse=${kimlikler[d.kod]}`,
      });
    } catch (e) {
      dersler.push({ kod: d.kod, hata: e.message });
    }
  }
  return { adres, okundu: new Date().toISOString(), programCiktilari: pc, matris, tyycIsaret: tyyc, dersler };
}

// ---------- Denetim ----------

const bos = (v) => v === "" || v === "-" || v == null;

/** Kurallar resmî ölçüt değildir; tutarsızlığı işaretler, kararı komisyon verir. */
export function denetle(veri, { aktsSaat = [25, 30], guncellikAy = 12 } = {}) {
  const bulgular = [];
  const ekle = (duzey, ders, kural, aciklama) => bulgular.push({ duzey, ders, kural, aciklama });
  const matrisDersi = Object.fromEntries(veri.matris.dersler.map((d) => [d.kod, d]));

  if (!veri.programCiktilari.length) ekle("hata", "-", "program-ciktisi", "Program öğrenme çıktıları okunamadı ya da boş.");
  if (veri.tyycIsaret === 0) ekle("uyari", "-", "tyyc", "TYYÇ matrisinde program çıktılarıyla işaretlenmiş hiçbir ilişki yok.");

  for (const d of veri.matris.dersler) {
    if (d.grupBasligi) continue;
    const degerler = Object.values(d.degerler);
    const dolu = degerler.filter((v) => !bos(v));
    if (d.zorunlu && !dolu.length) ekle("hata", d.kod, "matris-bos", "Zorunlu dersin program çıktısı matrisi satırı tamamen boş.");
    if (dolu.length >= 5 && new Set(dolu).size === 1 && Number(dolu[0]) >= 3) ekle("uyari", d.kod, "matris-ayrimsiz", `Bütün dolu hücreler ${dolu[0]}. Çıktılar arasında ayrım yapılmamış görünüyor.`);
  }

  const bugun = Date.now();
  for (const d of veri.dersler) {
    if (d.hata) { ekle("hata", d.kod, "okuma", `Ders sayfası okunamadı: ${d.hata}`); continue; }
    if (d.bos) {
      ekle(d.zorunlu ? "hata" : "uyari", d.kod, "bos-sayfa", `${d.zorunlu ? "Zorunlu" : "Seçmeli"} dersin bilgi sayfası boş: çıktı, değerlendirme, iş yükü ve konu yok.`);
      continue;
    }
    const toplam = d.isyuku.reduce((t, x) => t + (x.toplam || 0), 0);
    if (d.akts && toplam) {
      const oran = toplam / d.akts;
      if (oran < aktsSaat[0] || oran > aktsSaat[1]) ekle("hata", d.kod, "akts-isyuku", `Toplam iş yükü ${toplam} saat, AKTS ${d.akts}. AKTS başına ${oran.toFixed(1)} saat (beklenen ${aktsSaat[0]}-${aktsSaat[1]}).`);
    } else if (d.akts) ekle("uyari", d.kod, "akts-isyuku", "İş yükü tablosu okunamadı ya da boş.");
    const deg = d.degerlendirme.reduce((t, x) => t + (x.katki || 0), 0);
    if (d.degerlendirme.length && Math.round(deg) !== 100) ekle("hata", d.kod, "degerlendirme", `Değerlendirme katkıları toplamı %${deg}.`);
    if (!d.degerlendirme.length) ekle("uyari", d.kod, "degerlendirme", "Değerlendirme ölçütleri tablosu yok.");
    const yapi = d.dersYapisi.reduce((t, x) => t + (x.yuzde || 0), 0);
    if (d.dersYapisi.length && Math.round(yapi) !== 100) ekle("uyari", d.kod, "ders-yapisi", `Ders yapısı yüzdeleri toplamı %${yapi}.`);
    const saat = (d.tul || "").split("+").map(Number).reduce((t, x) => t + (x || 0), 0);
    if (saat > 0 && d.kredi === 0) ekle("uyari", d.kod, "kredi", `T+U+L ${d.tul} olduğu hâlde ulusal kredi 0.`);
    if (!d.ciktilar.length) ekle("hata", d.kod, "ders-ciktisi", "Dersin öğrenme çıktıları yok.");
    const listede = new Set(d.ciktilar.map((c) => c.kod));
    const katkida = Object.keys(d.katki).filter((k) => /^Ö\d+$/.test(k));
    const gorunmeyen = katkida.filter((k) => !listede.has(k));
    if (d.ciktilar.length && gorunmeyen.length) {
      ekle("hata", d.kod, "ders-ciktisi", `Katkı tablosunda olan ${gorunmeyen.join(", ")} öğrenme çıktıları listesinde görünmüyor. Herkese açık sayfada yalnız ${[...listede].join(", ")} var.`);
    }
    if (d.haftalar && d.haftalar < 14) ekle("uyari", d.kod, "haftalar", `Haftalık konu sayısı ${d.haftalar}.`);
    const [g, a, y] = (d.guncelleme || "").split(".").map(Number);
    if (y && (bugun - new Date(y, a - 1, g).getTime()) / (30 * 86400000) > guncellikAy) ekle("uyari", d.kod, "guncellik", `Son güncelleme ${d.guncelleme}.`);

    const tum = d.katki["Tüm"] || d.katki.All;
    const md = matrisDersi[d.kod];
    if (tum && md) {
      const farkli = Object.keys(tum).filter((p) => p in md.degerler && String(tum[p]).trim() !== String(md.degerler[p]).trim() && !(bos(tum[p]) && bos(md.degerler[p])));
      if (farkli.length) ekle("hata", d.kod, "matris-tutarlilik", `Ders sayfasındaki genel katkı ile program matrisi farklı: ${farkli.map((p) => `${p} ${tum[p] || "boş"}/${md.degerler[p] || "boş"}`).join(", ")}.`);
    }
    if (tum) {
      const satirlar = Object.entries(d.katki).filter(([k]) => /^Ö\d+$/.test(k)).map(([, v]) => v);
      if (satirlar.length) {
        const destekSiz = Object.keys(tum).filter((p) => sayi(tum[p]) !== null && sayi(tum[p]) > Math.max(0, ...satirlar.map((s) => sayi(s[p]) ?? 0)));
        if (destekSiz.length) ekle("uyari", d.kod, "katki-destegi", `Genel katkı hiçbir ders çıktısının katkısıyla desteklenmiyor: ${destekSiz.map((p) => `${p} (genel ${tum[p]}, en yüksek ${Math.max(0, ...satirlar.map((s) => sayi(s[p]) ?? 0))})`).join(", ")}.`);
      }
    }
  }
  return bulgular;
}
