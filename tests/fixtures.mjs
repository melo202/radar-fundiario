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
        "Rua B — 5% acima da faixa desta região",
        "Rua C — 2% acima da faixa desta região",
        "Rua D — 10% abaixo da faixa desta região",
      ],
    },
  },

  // Fase 11.1 (11.1-01): fixtures de propostaTexto/termoExclusividadeTexto/contratoTexto/
  // parseMatricula/numeroPorExtenso — funcoes novas no bloco RADAR_PURE (NEG-01/02/03). Contrato
  // de HONESTIDADE: campo de parte/valor/matricula ausente NUNCA e inventado, sempre "________";
  // nenhuma das 3 minutas retorna "undefined"/"NaN" em nenhum caso.

  // imovel comum, reusado pelos 3 tipos de minuta.
  negImovel: {
    endereco: "Rua Portugal, 582",
    bairro: "Setor Bueno",
    quadra: "45",
    lote: "12",
    areaTerr: 450,
    areaEdif: 220,
    inscricao: "3020150346",
    tipoImovel: "Apartamento",
  },

  propostaCasos: {
    // caso completo — todos os campos preenchidos.
    completo: {
      imovel: {
        endereco: "Rua Portugal, 582",
        bairro: "Setor Bueno",
        quadra: "45",
        lote: "12",
        areaTerr: 450,
        areaEdif: 220,
        inscricao: "3020150346",
        tipoImovel: "Apartamento",
      },
      proponente: { nome: "João da Silva", doc: "123.456.789-00", endereco: "Rua A, 10" },
      vendedor: { nome: "Maria Souza", doc: "987.654.321-00", endereco: "Rua B, 20" },
      valorOfertado: 500000,
      formaPagamento: "À vista",
      validadeDias: 10,
      foro: "Goiânia/GO",
    },
    // proponente.nome vazio — minuta deve usar CAMPO_VAZIO, nunca nome vazio silencioso/"undefined".
    proponenteSemNome: {
      imovel: {
        endereco: "Rua Portugal, 582",
        bairro: "Setor Bueno",
        quadra: "45",
        lote: "12",
        areaTerr: 450,
        areaEdif: 220,
        inscricao: "3020150346",
        tipoImovel: "Apartamento",
      },
      proponente: { nome: "", doc: "", endereco: "" },
      vendedor: { nome: "Maria Souza", doc: "", endereco: "" },
      valorOfertado: 500000,
      formaPagamento: "À vista",
      validadeDias: 10,
      foro: null,
    },
    // valorOfertado ausente — clausula de valor deve usar CAMPO_VAZIO, nunca "R$ null"/"R$ NaN".
    semValor: {
      imovel: {
        endereco: "Rua Portugal, 582",
        bairro: "Setor Bueno",
        quadra: "45",
        lote: "12",
        areaTerr: 450,
        areaEdif: 220,
        inscricao: "3020150346",
        tipoImovel: "Apartamento",
      },
      proponente: { nome: "João da Silva", doc: null, endereco: null },
      vendedor: { nome: "Maria Souza", doc: null, endereco: null },
      valorOfertado: null,
      formaPagamento: null,
      validadeDias: null,
      foro: null,
    },
  },

  termoCasos: {
    exclusivaSimComAnuncio: {
      imovel: {
        endereco: "Rua Portugal, 582",
        bairro: "Setor Bueno",
        quadra: "45",
        lote: "12",
        areaTerr: 450,
        areaEdif: 220,
        inscricao: "3020150346",
        tipoImovel: "Apartamento",
      },
      proprietario: { nome: "Maria Souza", doc: "987.654.321-00", endereco: "Rua B, 20" },
      corretor: { nome: "Ana Souza", creci: "12345" },
      prazoDias: 90,
      comissaoPct: 6,
      exclusiva: true,
      autorizaAnuncio: true,
      foro: "Goiânia/GO",
    },
    abertaSemAnuncio: {
      imovel: {
        endereco: "Rua Portugal, 582",
        bairro: "Setor Bueno",
        quadra: "45",
        lote: "12",
        areaTerr: 450,
        areaEdif: 220,
        inscricao: "3020150346",
        tipoImovel: "Apartamento",
      },
      proprietario: { nome: "Maria Souza", doc: null, endereco: null },
      corretor: { nome: "Ana Souza", creci: "12345" },
      prazoDias: 90,
      comissaoPct: 6,
      exclusiva: false,
      autorizaAnuncio: null,
      foro: null,
    },
    autorizaAnuncioFalse: {
      imovel: {
        endereco: "Rua Portugal, 582",
        bairro: "Setor Bueno",
        quadra: "45",
        lote: "12",
        areaTerr: 450,
        areaEdif: 220,
        inscricao: "3020150346",
        tipoImovel: "Apartamento",
      },
      proprietario: { nome: "Maria Souza", doc: null, endereco: null },
      corretor: { nome: "Ana Souza", creci: "12345" },
      prazoDias: 90,
      comissaoPct: 6,
      exclusiva: null,
      autorizaAnuncio: false,
      foro: null,
    },
  },

  contratoCasos: {
    completo: {
      imovel: {
        endereco: "Rua Portugal, 582",
        bairro: "Setor Bueno",
        quadra: "45",
        lote: "12",
        areaTerr: 450,
        areaEdif: 220,
        inscricao: "3020150346",
        tipoImovel: "Apartamento",
      },
      vendedor: { nome: "Maria Souza", doc: "987.654.321-00", endereco: "Rua B, 20" },
      comprador: { nome: "João da Silva", doc: "123.456.789-00", endereco: "Rua A, 10" },
      matricula: "12.345",
      cartorio: "3º Ofício de Registro de Imóveis",
      precoTotal: 500000,
      foro: "Goiânia/GO",
    },
    semMatriculaCartorio: {
      imovel: {
        endereco: "Rua Portugal, 582",
        bairro: "Setor Bueno",
        quadra: "45",
        lote: "12",
        areaTerr: 450,
        areaEdif: 220,
        inscricao: "3020150346",
        tipoImovel: "Apartamento",
      },
      vendedor: { nome: "Maria Souza", doc: null, endereco: null },
      comprador: { nome: "João da Silva", doc: null, endereco: null },
      matricula: null,
      cartorio: null,
      precoTotal: null,
      foro: null,
    },
  },

  // parseMatricula: 2 ordens de frase real ("Matrícula nº X, situado no Nº Ofício de Registro de
  // Imóveis" vs. "Cartório do Nº Ofício" sem "registro de imóveis" no fim — fix plan-check), mais
  // sem-match e string vazia (nunca lança excecao).
  parseMatriculaCasos: {
    canonico: {
      texto: "Matrícula nº 12.345, situado no 3º Ofício de Registro de Imóveis desta Comarca",
      expectMatriculaContains: "12.345",
      expectCartorioContains: "3",
    },
    ordemCartorioOficio: {
      texto: "MATRICULA N. 45678, Cartório do 2° Ofício",
      expectMatriculaContains: "45678",
      expectCartorioContains: "2",
    },
    semMatch: {
      texto: "texto qualquer sem nenhum padrão de matrícula ou cartório",
    },
    vazio: {
      texto: "",
    },
  },

  // numeroPorExtenso: casos basicos + fronteiras do extenso pt-BR (fix plan-check) — um milhao
  // singular, milhoes plural, cem vs cento, mil sem "um", null nunca "R$ NaN"/"R$ null".
  extensoCasos: {
    quinhentosMil: { valor: 500000, expectContains: ["quinhentos mil reais", "R$ 500.000,00"] },
    noventa: { valor: 90, expectContains: ["noventa reais"] },
    decimalGrande: { valor: 1234567.89, expectContains: ["R$ 1.234.567,89", "R$"] },
    umMilhao: { valor: 1000000, expectContains: ["um milhão de reais"], expectNotContains: ["um milhões", "milhões"] },
    doisMilhoes: { valor: 2000000, expectContains: ["dois milhões de reais"] },
    cem: { valor: 100, expectContains: ["cem reais"], expectNotContains: ["cento"] },
    centoCinquenta: { valor: 150, expectContains: ["cento e cinquenta reais"] },
    mil: { valor: 1000, expectContains: ["mil reais"], expectNotContains: ["um mil"] },
    nulo: { valor: null, expectEmpty: true },
    negativo: { valor: -500, expectEmpty: true }, // WR-01 (11.1-REVIEW): preço negativo não é válido — "" honesto, nunca Math.abs silencioso
  },

  // resumoPredio (Fase 12, 12-01, PRED-01): amostra vazia/parcial/completa — honesto, nunca NaN.
  // Cada unidade e um subconjunto do objeto `a` do cadastro + __est opcional (mercadoEstimado ja
  // calculado pela Wave 2, fora do bloco puro).
  resumoPredioCasos: {
    vazio: {
      units: [],
      expect: { n: 0, areaMedia: null, venalMedio: null, estimadoMedio: null, faixaLo: null, faixaHi: null },
    },
    semArea: {
      // 3 unidades, nenhuma com areaedif>0 (undefined/0/negativo tratado como ausente)
      units: [
        { areaedif: 0, vlvenal: 100000, incompl: "APTO 101", uso: 1 },
        { areaedif: undefined, vlvenal: 150000, incompl: "APTO 102", uso: 1 },
        { areaedif: null, vlvenal: 0, incompl: "APTO 103", uso: 1 },
      ],
      expectAreaMedia: null,
      expectVenalMedio: 125000, // media so das 2 com vlvenal>0 (100000+150000)/2
    },
    semVenalNenhuma: {
      units: [
        { areaedif: 80, vlvenal: 0, incompl: "APTO 201", uso: 1 },
        { areaedif: 90, vlvenal: undefined, incompl: "APTO 202", uso: 1 },
      ],
      expectVenalMedio: null,
      expectAreaMedia: 85,
    },
    mistaComZeros: {
      // area/venal mistos: alguns 0 (excluidos da media), outros >0 (entram na media); n conta todas
      units: [
        { areaedif: 100, vlvenal: 200000, incompl: "APTO 301", uso: 1 },
        { areaedif: 0, vlvenal: 0, incompl: "APTO 302", uso: 1 },
        { areaedif: 120, vlvenal: 240000, incompl: "APTO 303", uso: 1 },
      ],
      expectN: 3,
      expectAreaMedia: 110, // (100+120)/2, ignora a de 0
      expectVenalMedio: 220000, // (200000+240000)/2, ignora a de 0
    },
    comEstimativaParcial: {
      // 3 unidades, 2 com __est preenchido, 1 sem (null) — estimadoMedio/faixa SO sobre as 2
      units: [
        { areaedif: 80, vlvenal: 160000, incompl: "APTO 401", uso: 1, __est: { lo: 150000, hi: 190000 } },
        { areaedif: 90, vlvenal: 180000, incompl: "APTO 402", uso: 1, __est: null },
        { areaedif: 100, vlvenal: 200000, incompl: "APTO 403", uso: 1, __est: { lo: 190000, hi: 230000 } },
      ],
      expectEstimadoMedio: 190000, // media de (150000+190000)/2=170000 e (190000+230000)/2=210000 -> 190000
      expectFaixaLo: 150000, // min dos lo
      expectFaixaHi: 230000, // max dos hi
    },
    semEstimativaNenhuma: {
      units: [
        { areaedif: 80, vlvenal: 160000, incompl: "APTO 501", uso: 1 },
        { areaedif: 90, vlvenal: 180000, incompl: "APTO 502", uso: 1, __est: undefined },
      ],
      expectEstimadoMedio: null,
      expectFaixaLo: null,
      expectFaixaHi: null,
    },
    // CHECKER RECOMMENDATION: __est parcialmente malformado (lo ausente/undefined, hi presente) —
    // resumoPredio deve manter o invariante "estimadoMedio/faixaLo/faixaHi existem juntos ou nenhum"
    // mesmo com entrada suja. Guarda: so conta __est com AMBOS lo>0 e hi>0.
    estimativaMalformadaParcial: {
      units: [
        { areaedif: 80, vlvenal: 160000, incompl: "APTO 601", uso: 1, __est: { lo: undefined, hi: 100 } },
        { areaedif: 90, vlvenal: 180000, incompl: "APTO 602", uso: 1, __est: { lo: 0, hi: 200 } },
      ],
      expectEstimadoMedio: null,
      expectFaixaLo: null,
      expectFaixaHi: null,
    },
    nContaTodas: {
      units: [
        { areaedif: 0, vlvenal: 0, incompl: "APTO 701", uso: 1 },
        { areaedif: 0, vlvenal: 0, incompl: "APTO 702", uso: 1 },
        { areaedif: 100, vlvenal: 200000, incompl: "APTO 703", uso: 1 },
      ],
      expectN: 3,
    },
  },

  // ordenaUnidades (Fase 12, 12-01, PRED-02): 4 criterios + nao-mutacao + estabilidade.
  ordenaUnidadesCasos: {
    // pm2 = vlvenal/areaedif; unidade B tem pm2 mais baixo (mais barata por m2) -> vem primeiro
    // em "oportunidade" (ASC); unidade C nao tem areaedif/vlvenal validos -> vai pro fim.
    oportunidade: {
      units: [
        { id: "A", areaedif: 100, vlvenal: 300000 }, // pm2 = 3000
        { id: "B", areaedif: 100, vlvenal: 200000 }, // pm2 = 2000 (mais barato, vem primeiro)
        { id: "C", areaedif: 0, vlvenal: 0 }, // sem base -> fim
      ],
      expectFirstId: "B",
      expectLastId: "C",
    },
    oportunidadeEmpate: {
      // A e B tem pm2 identico -> mantem ordem original (indice 0 antes de indice 1)
      units: [
        { id: "A", areaedif: 100, vlvenal: 200000 }, // pm2 = 2000
        { id: "B", areaedif: 50, vlvenal: 100000 }, // pm2 = 2000 (empate)
        { id: "C", areaedif: 100, vlvenal: 500000 }, // pm2 = 5000
      ],
      expectOrderIds: ["A", "B", "C"],
    },
    estimadoAsc: {
      units: [
        { id: "A", __est: { lo: 200000, hi: 300000 } }, // media 250000
        { id: "B", __est: { lo: 100000, hi: 150000 } }, // media 125000 (menor, vem primeiro)
        { id: "C" }, // sem __est -> fim
      ],
      expectFirstId: "B",
      expectLastId: "C",
    },
    areaDesc: {
      units: [
        { id: "A", areaedif: 80 },
        { id: "B", areaedif: 150 }, // maior area, vem primeiro
        { id: "C", areaedif: 0 }, // sem area -> fim
        { id: "D", areaedif: undefined }, // sem area -> fim
      ],
      expectFirstId: "B",
      expectLastIds: ["C", "D"],
    },
    padrao: {
      units: [
        { id: "A", areaedif: 80 },
        { id: "B", areaedif: 150 },
        { id: "C", areaedif: 10 },
      ],
      expectOrderIds: ["A", "B", "C"],
    },
    criterioInvalido: {
      units: [
        { id: "A", areaedif: 80 },
        { id: "B", areaedif: 150 },
      ],
      expectOrderIds: ["A", "B"], // fallback = padrao
    },
    naoMutacao: {
      units: [
        { id: "A", areaedif: 80, vlvenal: 100000 },
        { id: "B", areaedif: 150, vlvenal: 300000 },
        { id: "C", areaedif: 10, vlvenal: 50000 },
      ],
    },
  },

  // remapPredio (Fase 12, fix CR-01 12-REVIEW.md): remapeamento POSICIONAL, nunca por chave —
  // cobre exatamente o cenario que quebrava antes do fix: 2 unidades do MESMO predio com
  // (ci,insubprinc) colidentes (boxes/garagens sem sub-inscricao formal, insubprinc undefined/0).
  remapPredioCasos: {
    // 3 unidades do predio "P1" (X,Y,Z) com insubprinc colidente (todas 0/undefined) + 1 unidade
    // de outro predio "P2" que NUNCA deveria ser tocada. ordenadas chega em ordem REVERSA (Z,Y,X)
    // simulando um criterio de ordenacao qualquer — o teste verifica que as 3 identidades sao
    // preservadas (nenhuma duplicada, nenhuma perdida) e a unidade de P2 fica intacta na mesma posicao.
    colisaoInsubprinc: {
      list: [
        { id: "X", ci: "P1", insubprinc: 0 },
        { id: "OUTRO", ci: "P2", insubprinc: 0 },
        { id: "Y", ci: "P1", insubprinc: undefined },
        { id: "Z", ci: "P1", insubprinc: 0 },
      ],
      // ordenadas: fila com as MESMAS referencias (identidade) dos itens de P1, em ordem Z,Y,X
      ordenadasIds: ["Z", "Y", "X"],
      chaveP1: "P1",
      expectOrderIds: ["Z", "OUTRO", "Y", "X"], // P2 intocado na posicao 1; P1 consome a fila em ordem
    },
    // fila vazia (ex.: predio sem unidades) -> list retorna INTACTA (nenhum pertence() deveria
    // ser true nesse caso de uso real, mas a funcao nao deve lancar nem embaralhar se for).
    filaVazia: {
      list: [{ id: "A", ci: "P3" }],
      ordenadasIds: [],
      chaveP1: "NENHUM",
      expectOrderIds: ["A"],
    },
  },

  // ehAptoProvavel (Fase 12, 12-01, PRED-02): heuristica uso residencial(1)/misto(5) E nao-garagem.
  ehAptoProvavelCasos: {
    residencial: { a: { uso: 1, incompl: "APTO 302" }, expect: true },
    misto: { a: { uso: 5, incompl: "APTO 10" }, expect: true },
    residencialGaragem: { a: { uso: 1, incompl: "BOX 12" }, expect: false },
    comercial: { a: { uso: 3, incompl: "SALA 5" }, expect: false },
    mistoGaragem: { a: { uso: 5, incompl: "VAGA 08" }, expect: false },
    residencialSubsolo: { a: { uso: 1, incompl: "APTO 302 SUBSOLO" }, expect: false },
  },

  // analisePredicoTexto (Fase 12, 12-01, PRED-01): omissao condicional por metrica ausente, honesto,
  // sem "undefined"/"NaN"/"null" em nenhuma combinacao.
  analisePredicoTextoCasos: {
    completo: {
      resumo: { n: 26, areaMedia: 94, venalMedio: 412000, estimadoMedio: 720000, faixaLo: 650000, faixaHi: 890000 },
      meta: { nome: "Edifício Sumer Park", quadra: "12", lote: "5", endereco: "Rua das Flores, 123" },
    },
    semEstimativa: {
      resumo: { n: 10, areaMedia: 70, venalMedio: 300000, estimadoMedio: null, faixaLo: null, faixaHi: null },
      meta: { nome: "Edifício Alfa", quadra: "3", lote: "2", endereco: "Av. Central, 45" },
    },
    semArea: {
      resumo: { n: 8, areaMedia: null, venalMedio: 250000, estimadoMedio: 400000, faixaLo: 350000, faixaHi: 450000 },
      meta: { nome: "Edifício Beta", quadra: "7", lote: "1", endereco: "Rua B, 10" },
    },
    semEndereco: {
      resumo: { n: 12, areaMedia: 60, venalMedio: 200000, estimadoMedio: 300000, faixaLo: 280000, faixaHi: 320000 },
      meta: { nome: "Edifício Gama", quadra: "1", lote: "1", endereco: null },
    },
    zerado: {
      resumo: { n: 0, areaMedia: null, venalMedio: null, estimadoMedio: null, faixaLo: null, faixaHi: null },
      meta: { nome: null, quadra: null, lote: null, endereco: null },
    },
  },
};
