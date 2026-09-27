// Belgelerden metin çıkarır: PDF (sayfa numaralarıyla), Word (.docx) ve düz metin.
// Kurumlardaki kanıtların çoğu PDF ve Word olduğu için ek bir program kurmadan okunabilmeleri gerekir.
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

/** ZIP içinden tek bir dosyayı çıkarır (Word belgeleri ZIP'tir). */
function zipDosyasi(tampon, aranan) {
  const son = tampon.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (son < 0) return null;
  let konum = tampon.readUInt32LE(son + 16);
  const adet = tampon.readUInt16LE(son + 10);
  for (let i = 0; i < adet; i++) {
    const yontem = tampon.readUInt16LE(konum + 10);
    const sikisik = tampon.readUInt32LE(konum + 20);
    const adUzunluk = tampon.readUInt16LE(konum + 28);
    const ekUzunluk = tampon.readUInt16LE(konum + 30);
    const yorumUzunluk = tampon.readUInt16LE(konum + 32);
    const yerel = tampon.readUInt32LE(konum + 42);
    const ad = tampon.toString("utf8", konum + 46, konum + 46 + adUzunluk);
    if (ad === aranan) {
      const veriBasi = yerel + 30 + tampon.readUInt16LE(yerel + 26) + tampon.readUInt16LE(yerel + 28);
      const veri = tampon.subarray(veriBasi, veriBasi + sikisik);
      return yontem === 0 ? veri : inflateRawSync(veri);
    }
    konum += 46 + adUzunluk + ekUzunluk + yorumUzunluk;
  }
  return null;
}

const VARLIKLAR = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&apos;": "'" };

function wordMetni(tampon) {
  const xml = zipDosyasi(tampon, "word/document.xml");
  if (!xml) return null;
  return xml.toString("utf8")
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<\/w:tc>/g, " | ")
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|apos);/g, (m) => VARLIKLAR[m])
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function pdfMetni(tampon) {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(tampon));
  const { text } = await extractText(pdf, { mergePages: false });
  const sayfalar = Array.isArray(text) ? text : [text];
  if (!sayfalar.join("").trim()) return { metin: "", tarali: true };
  return { metin: sayfalar.map((s, i) => `--- Sayfa ${i + 1} ---\n${s.trim()}`).join("\n\n") };
}

/** { metin } ya da { uyari } döndürür. */
export async function belgeMetni(yol) {
  const tampon = readFileSync(yol);
  if (/\.pdf$/i.test(yol) || tampon.subarray(0, 5).toString() === "%PDF-") {
    try {
      const { metin, tarali } = await pdfMetni(tampon);
      if (tarali) return { uyari: "Bu PDF taranmış bir görüntü, içinde okunabilir metin yok. Kullanıcıdan metin içeren bir sürümünü iste ya da belgeyi elle özetlemesini rica et." };
      return { metin };
    } catch (e) {
      return { uyari: `PDF okunamadı: ${e.message}` };
    }
  }
  if (/\.docx$/i.test(yol)) {
    const metin = wordMetni(tampon);
    return metin === null ? { uyari: "Word dosyası okunamadı." } : { metin };
  }
  if (/\.(doc|xls|xlsx|ppt|pptx)$/i.test(yol)) {
    return { uyari: "Bu dosya türü doğrudan okunamıyor. Kullanıcıdan PDF (Excel için CSV) olarak kaydetmesini iste." };
  }
  if (tampon.includes(0)) return { uyari: "Bu dosya metin değil." };
  return { metin: tampon.toString("utf8") };
}
