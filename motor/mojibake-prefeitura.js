/* Reparo de mojibake das certidões da Prefeitura de Goiânia (25/08/2026).
   Diagnóstico (verificado ao vivo com inscrição real): os endpoints sccer00201w0
   (CND imobiliária) e sccer00202w0 (certidão cadastral) servem, no GET direto,
   bytes UTF-8 com U+FFFD (EF BF BD) no lugar de CADA caractere acentuado —
   a própria prefeitura corrompeu o template ao ler Latin-1 como UTF-8. Por isso
   a certidão sai "CERTID¿½O" no navegador (resposta sem charset → o browser
   decodifica UTF-8 como windows-1252). O formulário oficial (f0) e o POST com
   captcha saem corretos; o atalho GET (descoberta do usuário, sem captcha) vem
   quebrado DA FONTE — não é bug nosso, mas o reparo é nosso.

   Como cada vogal acentuada/ç vira EXATAMENTE um U+FFFD e o texto é jurídico
   padronizado, o reparo por dicionário + regras de sufixo recupera o documento.
   Régua LGPD: o dicionário só contém palavras do TEMPLATE oficial e nomes
   comuns — nunca dado de titular. */

const FFFD = "�";

/* Dicionário do template oficial (minúsculo → correto). O caso (MAIÚSCULO,
   Capitalizado) é restaurado pelo padrão da palavra original. */
const DIC = new Map(Object.entries({
  "certid�o": "certidão",
  "tribut�rio": "tributário",
  "tribut�ria": "tributária",
  "c�digo": "código",
  "n�o": "não",
  "n�": "nº",
  "d�vidas": "dívidas",
  "d�bito": "débito",
  "d�bitos": "débitos",
  "par�grafo": "parágrafo",
  "inscri��o": "inscrição",
  "confirma��o": "confirmação",
  "imobili�ria": "imobiliária",
  "imobili�rio": "imobiliário",
  "imobili�rios": "imobiliários",
  "mobili�ria": "mobiliária",
  "at�": "até",
  "est�": "está",
  "endere�o": "endereço",
  "endere�os": "endereços",
  "invalidar�": "invalidará",
  "dever�": "deverá",
  "im�vel": "imóvel",
  "im�veis": "imóveis",
  "emiss�o": "emissão",
  "p�blica": "pública",
  "n�mero": "número",
  "goi�nia": "goiânia",
  "econ�micas": "econômicas",
  "eletr�nico": "eletrônico",
  "caracter�sticas": "características",
  "s�o": "são",
  "jos�": "josé",
  "ap�s": "após",
  "c�pia": "cópia",
  "autentica��o": "autenticação",
  "situa��o": "situação",
  "rela��o": "relação",
  "averba��o": "averbação",
  "matr�cula": "matrícula",
  "domic�lio": "domicílio",
  "propriet�rio": "proprietário",
  "propriet�ria": "proprietária",
  "t�tulo": "título",
  "�rg�o": "órgão",
  "munic�pio": "município",
  "exerc�cio": "exercício",
  "d�cimo": "décimo",
  "usufrutu�rio": "usufrutuário",
  "c�njuge": "cônjuge",
  "andr�": "andré",
  "mar�a": "maria",
  "v�lido": "válido",
  "v�lida": "válida",
  "gratuita": "gratuita",
}));

/* aplicaCaso(original, reparada): devolve a palavra reparada no MESMO padrão
   de caixa da original (CERTID�O→CERTIDÃO, Certid�o→Certidão, certid�o→certidão). */
function aplicaCaso(original, reparada) {
  if (/^[^a-zà-ÿ]+$/.test(original.replaceAll(FFFD, "A")) && /[A-Z]/.test(original)) {
    return reparada.toUpperCase(); /* tudo maiúsculo */
  }
  if (original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()) {
    return reparada[0].toUpperCase() + reparada.slice(1); /* Capitalizada */
  }
  return reparada;
}

/* reparoGenerico(palavra): sufixos produtivos do juridiquês quando o dicionário
   não cobre. Conservador — só padrões sem ambiguidade prática. */
function reparoGenerico(p) {
  if (/��o$/i.test(p)) return p.replace(/��o$/i, m => m[2] === "O" ? "ÇÃO" : "ção");
  if (/��es$/i.test(p)) return p.replace(/��es$/i, m => m[3] === "S" ? "ÇÕES" : "ções");
  if (/�o$/i.test(p) && p.length > 2) return p.replace(/�o$/i, m => m[1] === "O" ? "ÃO" : "ão");
  if (/r�$/i.test(p)) return p.replace(/r�$/i, m => m[0] === "R" ? "RÁ" : "rá");
  return null;
}

/* repararMojibake(texto): recupera os acentos perdidos (U+FFFD) do texto. */
export function repararMojibake(texto) {
  let t = String(texto || "");
  if (!t.includes(FFFD)) return t;
  /* 1) palavras com �: dicionário, depois regra genérica de sufixo */
  t = t.replace(/[A-Za-zÀ-ÿ]*�[A-Za-zÀ-ÿ�]*/g, (palavra) => {
    const dic = DIC.get(palavra.toLowerCase());
    if (dic) return aplicaCaso(palavra, dic);
    const gen = reparoGenerico(palavra);
    if (gen) return gen;
    return palavra; /* desconhecida: honesta, fica o � visível */
  });
  /* 2) ordinal quebrado depois de dígito: "parágrafo 1�" -> "1º", "7�" -> "7º"
        (nos textos legais das certidões é sempre o ordinal masculino) */
  t = t.replace(/(\d)�/g, "$1º");
  /* 3) � isolado entre espaços/pontuação: nestes documentos é sempre "é/É"
        ("ESTA CERTID�O � GRATUITA", "a Certid�o � de 90 dias") */
  t = t.replace(/(^|[\s>(])�(?=[\s<),.;]|$)/g, (m, antes, off, str) => {
    const prev = str.slice(0, off).match(/([A-Za-zÀ-ÿ�]+)[\s>(]*$/);
    const maiusculas = prev && /^[^a-zà-ÿ]+$/.test(prev[1].replaceAll(FFFD, "A")) && /[A-Z]/.test(prev[1]);
    return antes + (maiusculas ? "É" : "é");
  });
  return t;
}

/* decodificarPrefeitura(buf): as páginas da prefeitura vêm em DOIS encodings:
   - Latin-1 clássico (espelho siptu, formulários): bytes 0xE3 etc. — UTF-8 fatal FALHA;
   - UTF-8 já corrompido com U+FFFD (sccer w0 no GET): decodifica e passa pelo reparo.
   Devolve o texto pronto para parse/render — nunca "ï¿½", nunca "Certid�o". */
export function decodificarPrefeitura(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  try {
    const utf8 = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return utf8.includes(FFFD) ? repararMojibake(utf8) : utf8;
  } catch {
    return new TextDecoder("iso-8859-1").decode(bytes); /* Latin-1 clássico */
  }
}
