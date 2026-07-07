// Fixtures para tests/busca.test.mjs — casos de entrada/saída nomeados, reusados pelo harness.
// Documentam o CONTRATO ATUAL das funções puras de radar-goiania.html (bloco RADAR_PURE),
// incluindo os falsos-positivos conhecidos que 08-02 vai corrigir (não são bugs desta plan).

export const FIXTURES = {
  norm: [
    { in: "Rua Bela", out: "RUA BELA" },
    { in: "faiçalville", out: "FAICALVILLE" },
  ],

  ruaCore: [
    { in: "Rua 135", out: "135" }, // caso obrigatório do roadmap: "Rua 135"
    { in: "R  MARAJO", out: "MARAJO" },
    { in: "Avenida T-4", out: "T-4" },
  ],

  matchApto: [
    { incompl: "APTO 1901", q: "1901", out: true }, // caso obrigatório do roadmap: apto "1901"
    { incompl: "APTO 1901", q: "19", out: false }, // caso obrigatório do roadmap: "19" NÃO bate "1901" (fronteira de dígitos)
    { incompl: "APT 19", q: "19", out: true },
  ],

  okQ: [
    { nq: "10E", qU: "10E", out: true }, // caso obrigatório do roadmap: quadra "10E"
    { nq: "", qU: "", out: true },
    // substring fallback AINDA vale nesta plan — 08-02 fixa isto; aqui só documenta o estado ATUAL.
    // caso obrigatório do roadmap: "135" isolado bate "2135" (falso-positivo conhecido, preservado)
    { nq: "2135", qU: "135", out: true },
  ],

  okL: [
    { nl: "20/21", lU: "20", out: true }, // caso obrigatório do roadmap: lote "20/21" bate "20"
    { nl: "20/21", lU: "21", out: true }, // caso obrigatório do roadmap: lote "20/21" bate "21"
    { nl: "20/21", lU: "22", out: false },
  ],

  // "insc": casos de deteccao de campo por tamanho de dígitos — decisão de MODO fica para 08-03;
  // aqui só confirmamos os fatos de tamanho/contexto que servem de base para aquela decisão.
  insc: [
    { raw: "135", digitsOnly: "135", isAmbiguous: true }, // caso obrigatório do roadmap: "135" isolado
    { raw: "Rua 135", hasStreetType: true }, // caso obrigatório do roadmap: "Rua 135"
    { raw: "Q135", hasQuadraToken: true }, // caso obrigatório do roadmap: "Q135"
    { raw: "3020150346", len: 10, field: "ci" }, // caso obrigatório do roadmap: inscrição 10 dígitos
    { raw: "30201503461234", len: 14, field: "nrinscr" }, // caso obrigatório do roadmap: inscrição 14 dígitos
  ],
};
