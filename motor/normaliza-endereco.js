/* Normalização de logradouro para o geocoding CNEFE (§7) — PURO, testado na suíte.
   O CNEFE de Goiânia grafa ruas letra+número com ESPAÇO ("S 3", "T 37", "C 104"),
   ruas numeradas ora em dígitos ("135") ora por extenso ("TRES", "VINTE E UM") —
   medido no arquivo real de 15/07/2026. O usuário digita "s3", "s-3", "rua 3"...
   Esta função leva as duas pontas à MESMA forma canônica.
   ESPELHO EXATO em gerar-enderecos.py (normaliza_logradouro) — manter em sincronia. */

const TIPOS = new Set(["rua", "r", "avenida", "av", "alameda", "al", "travessa", "tv",
  "praca", "pc", "rodovia", "rod", "estrada", "est", "viela", "beco", "via"]);

const UNIDADES = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13,
  quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18,
  dezenove: 19 };
const DEZENAS = { vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60,
  setenta: 70, oitenta: 80, noventa: 90 };

/* "vinte e um" -> 21, "cento e trinta e cinco" -> 135; null se algum token não for número */
function extensoParaNumero(tokens) {
  let total = 0, algum = false;
  for (const t of tokens) {
    if (t === "e") continue;
    if (t === "cem" || t === "cento") { total += 100; algum = true; }
    else if (t in DEZENAS) { total += DEZENAS[t]; algum = true; }
    else if (t in UNIDADES) { total += UNIDADES[t]; algum = true; }
    else return null;
  }
  return algum ? total : null;
}

export function semAcento(s) {
  /* faixa de diacríticos combinantes por ESCAPE — literal invisível já quebrou build */
  return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function normalizaLogradouro(nome) {
  let s = semAcento(nome || "").toLowerCase()
    .replace(/[-.,/º°ª]/g, " ")
    .replace(/\s+/g, " ").trim();
  if (!s) return "";
  let tokens = s.split(" ");
  /* tipo de via na frente ("rua s3", "av t 63") sai — o CNEFE guarda o nome sem tipo */
  if (tokens.length > 1 && TIPOS.has(tokens[0])) tokens = tokens.slice(1);
  /* nome inteiro por extenso vira dígito: "tres" -> "3", "vinte e um" -> "21" */
  const n = extensoParaNumero(tokens);
  if (n != null) return String(n);
  /* letra(s)+número colados ou soltos viram a forma do CNEFE: "s3"/"s-03" -> "s 3" */
  const junto = tokens.join(" ");
  const m = junto.match(/^([a-z]{1,3}) ?0*(\d+)$/);
  if (m && !TIPOS.has(m[1])) return `${m[1]} ${m[2]}`;
  /* só dígitos: zeros à esquerda fora ("035" -> "35") */
  if (/^\d+$/.test(junto)) return String(Number(junto));
  return junto;
}
