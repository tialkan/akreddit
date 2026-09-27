// Satır satır kullanıcı girdisi. readline'ın question() yöntemi, soru sorulmadan önce gelen
// satırları kaybeder (girdi dosyadan ya da başka bir programdan geldiğinde). Burada satırlar kuyrukta bekler.
import { createInterface } from "node:readline";

export function girdiAc() {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
  const kuyruk = [];
  const bekleyenler = [];
  let kapandi = false;
  rl.on("line", (satir) => (bekleyenler.length ? bekleyenler.shift()(satir) : kuyruk.push(satir)));
  rl.on("close", () => { kapandi = true; while (bekleyenler.length) bekleyenler.shift()(null); });

  /** Soruyu yazar, bir satır bekler. Girdi bittiyse null döner. */
  function sor(soru, { gizli = false } = {}) {
    const asil = rl._writeToOutput;
    if (gizli && rl.terminal && asil) {
      rl._writeToOutput = (metin) => asil.call(rl, /^[\r\n]+$/.test(metin) ? metin : metin.startsWith(soru) ? soru + "•".repeat(metin.length - soru.length) : "•".repeat(metin.length));
    }
    return new Promise((coz) => {
      const bitir = (satir) => { rl._writeToOutput = asil; coz(satir === null ? null : satir.trim()); };
      if (kuyruk.length) { process.stdout.write(`${soru}\n`); return bitir(kuyruk.shift()); }
      if (kapandi) return bitir(null);
      bekleyenler.push(bitir);
      rl.setPrompt(soru);
      rl.prompt();
    });
  }

  return { sor, kapat: () => rl.close() };
}
