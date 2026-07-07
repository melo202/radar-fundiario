// Fixtures para tests/busca.test.mjs — casos de entrada/saída nomeados, reusados pelo harness.
// Documentam o CONTRATO de SCORE (0=exato, 1=normalizado/dígitos-iguais, 2=substring-fallback,
// null=não casa) das funções puras de radar-goiania.html (bloco RADAR_PURE), pós 08-02 (BUSCA-07).

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

  matchScoreQ: [
    { nq: "10E", qU: "10E", out: 0 }, // caso obrigatório do roadmap: quadra "10E" — exato
    { nq: "", qU: "", out: 0 }, // sem filtro = "exato" (nenhum selo)
    // FIX do falso-positivo do roadmap: "135" isolado (consulta puramente numérica) NÃO
    // casa mais "2135" por substring cru — retorna null, o item sai do resultado.
    { nq: "2135", qU: "135", out: null },
    { nq: "1350", qU: "135", out: null },
    { nq: "135A", qU: "135", out: 1 }, // dígitos iguais ignorando letra/formatação
    { nq: "Q10E2", qU: "10E", out: 2 }, // consulta COM letra ainda aceita substring cru (fallback marcado)
  ],

  matchScoreL: [
    { nl: "20/21", lU: "20", out: 1 }, // caso obrigatório do roadmap: lote "20/21" bate "20" (token exato)
    { nl: "20/21", lU: "21", out: 1 }, // caso obrigatório do roadmap: lote "20/21" bate "21" (token exato)
    { nl: "20/21", lU: "22", out: null },
    { nl: "20", lU: "20", out: 0 }, // exato
  ],

  matchScoreRua: [
    { log: "135", rCore: "135", rD: "135", out: 0 }, // fronteira exata, termo único
    { log: "BELA VISTA", rCore: "BELA", rD: "", out: 0 }, // fronteira de palavra — token completo no início
    // FIX: rua "Bela" NÃO casa mais "Belantina" por substring de meio de palavra
    { log: "BELANTINA", rCore: "BELA", rD: "", out: null },
    { log: "T4 QD5", rCore: "T-4", rD: "4", out: 1 }, // rua numerada: fronteira de palavra não cobre "T-4"!="T4 QD5", cai no token de dígito "4"
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

  // Fase 9 (09-01): fixtures de score/confianca/leitura — funcoes puras novas no bloco RADAR_PURE.
  // Contrato HONESTIDADE: scoreOportunidade NUNCA inventa numero (retorna null sem base suficiente).
  scoreOportunidade: [
    // caso obrigatorio do CONTEXT.md/UI-SPEC: 8% abaixo da mediana -> "Boa oportunidade" (score alto)
    { myPm2: 4600, stats: {med:5000,q1:4500,q3:5500,n:8,min:4000,max:6200}, flags:{radius:400}, expectRange:[66,100], expectRotulo:"Boa oportunidade" },
    { myPm2: 5000, stats: {med:5000,q1:4500,q3:5500,n:8,min:4000,max:6200}, flags:{}, expectRange:[33,65], expectRotulo:"Oportunidade média" },
    { myPm2: 6000, stats: {med:5000,q1:4500,q3:5500,n:8,min:4000,max:6200}, flags:{}, expectRange:[0,32], expectRotulo:"Abaixo da mediana" },
    // SEM BASE: nunca inventa numero
    { myPm2: 5000, stats: {n:2}, flags:{}, expectNull:true },
    { myPm2: null, stats: {med:5000,q1:4500,q3:5500,n:8}, flags:{}, expectNull:true },
    { myPm2: 0, stats: {med:5000,q1:4500,q3:5500,n:8}, flags:{}, expectNull:true },
  ],
  scoreConfianca: [
    // alta: sem pendencias, >=8 comparaveis
    { inputs:{areaOk:true,nComps:9,atipico:false,venalOk:true}, expectNivel:"alta" },
    // media: 1 pendencia concreta (area) citada no porque
    { inputs:{areaOk:false,nComps:6,atipico:false,venalOk:true}, expectNivel:"media", expectPorqueContains:"área confirmada" },
    // baixa: >=2 pendencias (area + poucos comparaveis)
    { inputs:{areaOk:false,nComps:2,atipico:false,venalOk:true}, expectNivel:"baixa", expectPorqueContains:"comparáveis" },
  ],
  leituraPratica: [
    { inputs:{tipoImovel:"Apartamento",bairro:"Setor Bueno",oportunidade:{score:78,rotulo:"Boa oportunidade",porque:[]},confianca:{nivel:"media",porque:[]}}, expectContains:"Setor Bueno", expectNotContains:["mediana","percentil","quartil"] },
    { inputs:{tipoImovel:"Apartamento",bairro:"Setor Bueno",oportunidade:null,confianca:null}, expectExact:"Dados insuficientes para uma leitura de mercado — confira os dados técnicos abaixo." },
  ],

  // Fase 10 (10-01): fixtures de templates de WhatsApp/Captacao + helpers de persistencia pura
  // (oportunidadeItem/histAdd) — funcoes novas no bloco RADAR_PURE. Contrato de HONESTIDADE:
  // faixa=null NUNCA gera valor inventado; ASSINATURA so aparece com perfil.nome (nunca placeholder);
  // ALLOWLIST de oportunidadeItem nunca deixa PII de terceiro passar.

  // objeto `data` completo (ver <facts> do 10-01-PLAN.md) — COM perfil e faixa, usado nos testes
  // "com assinatura"/"com faixa" das 5 funcoes zap* + 4 funcoes capt*.
  zapComData: {
    endereco: "Rua Portugal, 582",
    bairro: "Setor Bueno",
    quadra: "45",
    lote: "12",
    tipoImovel: "Apartamento",
    faixa: { lo: 690000, hi: 780000 },
    scoreOp: { score: 78, rotulo: "Boa oportunidade", porque: ["Está 8% abaixo da mediana da vizinhança (comparáveis em até 400 m)."] },
    scoreConf: { nivel: "media", porque: ["faltou a área confirmada."] },
    leitura: "Apartamento no Setor Bueno. Boa liquidez esperada — preço competitivo para a região.",
    perfil: { nome: "Ana Souza", creci: "12345", contato: "62999999999" },
  },

  // mesmo data, SEM perfil — espera-se AUSENCIA total de linha de assinatura (nunca placeholder).
  zapSemPerfil: {
    endereco: "Rua Portugal, 582",
    bairro: "Setor Bueno",
    quadra: "45",
    lote: "12",
    tipoImovel: "Apartamento",
    faixa: { lo: 690000, hi: 780000 },
    scoreOp: { score: 78, rotulo: "Boa oportunidade", porque: ["Está 8% abaixo da mediana da vizinhança (comparáveis em até 400 m)."] },
    scoreConf: { nivel: "media", porque: ["faltou a área confirmada."] },
    leitura: "Apartamento no Setor Bueno. Boa liquidez esperada — preço competitivo para a região.",
    perfil: null,
  },

  // mesmo data, SEM faixa (faixa=null) — espera-se texto adaptado, NUNCA "R$ undefined"/NaN/inventado.
  zapSemFaixa: {
    endereco: "Rua Portugal, 582",
    bairro: "Setor Bueno",
    quadra: "45",
    lote: "12",
    tipoImovel: "Apartamento",
    faixa: null,
    scoreOp: null,
    scoreConf: null,
    leitura: "Apartamento no Setor Bueno. Dados insuficientes para uma leitura de mercado — confira os dados técnicos abaixo.",
    perfil: { nome: "Ana Souza", creci: "12345", contato: "62999999999" },
  },

  // objeto cadastral bruto `a` (mesmo shape de showDetail(a,ll)) simulando o retorno do ArcGIS —
  // inclui campos de terceiro (dtnascimen/nmtitular) que NUNCA podem chegar ao objeto persistido.
  oportunidadeItemInput: {
    a: {
      nrinscr: "30201503461234",
      ci: "3020150346",
      nmbairro: "Setor Bueno",
      nrquadra: "45",
      nrlote: "12",
      tplogradou: "R",
      nmlogradou: "R PORTUGAL",
      nrimovel: "582",
      areaterr: 450,
      areaedif: 220,
      vlvenal: 850000,
      dtnascimen: "19800101",
      nmtitular: "Fulano de Tal",
    },
    extras: { faixaLo: 690000, faixaHi: 780000, scoreOportunidade: 78, scoreConfianca: "media" },
  },

  // arrays para o teste FIFO puro de histAdd — 29 (nao excede cap 30, nenhuma remocao) e 30
  // (excede ao entrar o 31o item, remove o mais antigo = evicao real).
  histAddCases: {
    list29: Array.from({ length: 29 }, (_, i) => ({ insc: "item" + i })),
    list30: Array.from({ length: 30 }, (_, i) => ({ insc: "item" + i })),
    novoItem: { insc: "novo" },
    cap: 30,
  },

  // Fase 11 (11-01): fixtures de recomendaDocumento/pendenciasDocumento/fichaRapidaTexto — funcoes
  // novas no bloco RADAR_PURE. Contrato de HONESTIDADE (11-UI-SPEC.md/11-CONTEXT.md): PTAM nunca
  // e recomendado sem CNAI (explica o porque, nunca bloqueia); pendencias nunca marcam conservacao
  // como pendente (default "Bom"); fichaRapidaTexto nunca inventa faixa/comparaveis nem usa jargao.

  // matriz completa das 4 finalidades x 2 estados de CNAI (8 combinacoes) do Componente 1 do UI-SPEC.
  recomendaDocumentoCasos: [
    { finalidadeUso: "apresentar", cnai: false, expectDoc: "ficha", expectPorqueContains: "apresentar" },
    { finalidadeUso: "apresentar", cnai: true, expectDoc: "ficha", expectPorqueContains: "apresentar" },
    { finalidadeUso: "captar", cnai: false, expectDoc: "ficha", expectPorqueContains: "captar" },
    { finalidadeUso: "captar", cnai: true, expectDoc: "ficha", expectPorqueContains: "captar" },
    { finalidadeUso: "justificar", cnai: false, expectDoc: "relatorio", expectPorqueContains: "justificar" },
    { finalidadeUso: "justificar", cnai: true, expectDoc: "relatorio", expectPorqueContains: "justificar" },
    { finalidadeUso: "formal", cnai: false, expectDoc: "relatorio", expectPorqueContains: "CNAI" },
    { finalidadeUso: "formal", cnai: true, expectDoc: "ptam", expectPorqueContains: "CNAI" },
  ],

  // pendenciasDocumento: 2 casos completos do <behavior> do 11-01-PLAN.md — media (1 pendencia,
  // docOk indefinido = pendente) e alta (tudo confirmado, docOk=true = resolvido).
  pendenciasDocumentoCasos: [
    {
      inputs: { areaOk: false, nComps: 6, atipico: false, venalOk: true, docOk: undefined },
      expectNivel: "media",
      expectItens: {
        area: false,
        conservacao: true,
        documentacao: false,
      },
    },
    {
      inputs: { areaOk: true, nComps: 10, atipico: false, venalOk: true, docOk: true },
      expectNivel: "alta",
      expectItens: {
        area: true,
        conservacao: true,
        documentacao: true,
      },
    },
  ],

  // fichaRapidaTexto: casos de honestidade de faixa/comparaveis — mesmo shape `data` de zapComData.
  fichaRapidaCasos: {
    comFaixaSemComparaveis: {
      endereco: "Rua Portugal, 582",
      bairro: "Setor Bueno",
      quadra: "45",
      lote: "12",
      tipoImovel: "Apartamento",
      faixa: { lo: 300000, hi: 400000 },
      scoreOp: { score: 78, rotulo: "Boa oportunidade", porque: [] },
      scoreConf: { nivel: "media", porque: ["faltou a área confirmada."] },
      leitura: "Apartamento no Setor Bueno. Boa liquidez esperada — preço competitivo para a região.",
      perfil: { nome: "Ana Souza", creci: "12345", contato: "62999999999" },
    },
    semFaixaComComparaveis: {
      endereco: "Rua Portugal, 582",
      bairro: "Setor Bueno",
      quadra: "45",
      lote: "12",
      tipoImovel: "Apartamento",
      faixa: null,
      scoreOp: null,
      scoreConf: null,
      leitura: "Apartamento no Setor Bueno. Dados insuficientes para uma leitura de mercado — confira os dados técnicos abaixo.",
      perfil: { nome: "Ana Souza", creci: "12345", contato: "62999999999" },
      comparaveis: ["Rua X, nº 100 — 8% abaixo da faixa desta região"],
    },
    comMaisDe3Comparaveis: {
      endereco: "Rua Portugal, 582",
      bairro: "Setor Bueno",
      quadra: "45",
      lote: "12",
      tipoImovel: "Apartamento",
      faixa: { lo: 300000, hi: 400000 },
      scoreOp: null,
      scoreConf: null,
      leitura: "Apartamento no Setor Bueno.",
      perfil: null,
      comparaveis: [
        "Rua A — 8% abaixo da faixa desta região",
        "Rua B — 5% abaixo da faixa desta região",
        "Rua C — 2% acima da faixa desta região",
        "Rua D — 10% abaixo da faixa desta região",
      ],
    },
  },
};
