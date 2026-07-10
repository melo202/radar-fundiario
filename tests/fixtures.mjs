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
    { myPm2: 6000, stats: {med:5000,q1:4500,q3:5500,n:8,min:4000,max:6200}, flags:{}, expectRange:[0,32], expectRotulo:"Oportunidade baixa" },
    // SEM BASE: nunca inventa numero
    { myPm2: 5000, stats: {n:2}, flags:{}, expectNull:true },
    { myPm2: null, stats: {med:5000,q1:4500,q3:5500,n:8}, flags:{}, expectNull:true },
    { myPm2: 0, stats: {med:5000,q1:4500,q3:5500,n:8}, flags:{}, expectNull:true },
    // F5 FICHA-01: dispersao ~zero (q1===med===q3, vizinhanca homogenea) — imovel NA mediana NUNCA
    // vira 100 "Boa oportunidade"; score NEUTRO 50 com rotulo honesto. Fora da mediana, so a
    // DIRECAO com score moderado (75/25), nunca o extremo 100/0.
    { myPm2: 100, stats: {med:100,q1:100,q3:100,n:10,min:100,max:100}, flags:{}, expectRange:[50,50], expectRotulo:"Na mediana — vizinhança homogênea" },
    { myPm2: 90, stats: {med:100,q1:100,q3:100,n:10,min:100,max:100}, flags:{}, expectRange:[75,75], expectRotulo:"Boa oportunidade" },
    { myPm2: 110, stats: {med:100,q1:100,q3:100,n:10,min:100,max:100}, flags:{}, expectRange:[25,25], expectRotulo:"Oportunidade baixa" },
    // IQR 0 com outlier no max (9 iguais + 1 caro): imovel na mediana continua NEUTRO (a cerca
    // min/max nao salva — o colapso e dos quartis)
    { myPm2: 50, stats: {med:50,q1:50,q3:50,n:10,min:50,max:200}, flags:{}, expectRange:[50,50], expectRotulo:"Na mediana — vizinhança homogênea" },
  ],
  scoreConfianca: [
    // alta: sem pendencias, >=8 comparaveis
    { inputs:{areaOk:true,nComps:9,atipico:false,venalOk:true}, expectNivel:"alta" },
    // media: 1 pendencia concreta (area) citada no porque
    { inputs:{areaOk:false,nComps:6,atipico:false,venalOk:true}, expectNivel:"media", expectPorqueContains:"área confirmada" },
    // baixa: >=2 pendencias (area + poucos comparaveis)
    { inputs:{areaOk:false,nComps:2,atipico:false,venalOk:true}, expectNivel:"baixa", expectPorqueContains:"comparáveis" },
    // F5 FICHA-02: dispersao alta (amp=(q3-q1)/med > 0.4, MESMO criterio "imoveis muito variados"
    // do badge de renderComps) rebaixa UM nivel e cita a variabilidade no porque[]; "alta" nunca
    // coexiste com faixa muito variada. amp baixo ou ausente (pre-consulta) nunca rebaixa.
    { inputs:{areaOk:true,nComps:9,atipico:false,venalOk:true,amp:0.5}, expectNivel:"media", expectPorqueContains:"muito variados" },
    { inputs:{areaOk:false,nComps:6,atipico:false,venalOk:true,amp:0.5}, expectNivel:"baixa", expectPorqueContains:"muito variados" },
    { inputs:{areaOk:true,nComps:9,atipico:false,venalOk:true,amp:0.3}, expectNivel:"alta" },
    { inputs:{areaOk:true,nComps:9,atipico:false,venalOk:true,amp:null}, expectNivel:"alta" },
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
    // F5 ZAP-01/02: scoreConf NUNCA mais fabricado à mão — o teste computa a SAÍDA REAL de
    // scoreConfianca(scoreConfInputs) (o `porque` fabricado escondia o formato real pontuado).
    scoreConfInputs: { areaOk: false, nComps: 6, atipico: false, venalOk: true }, // => nivel "media"
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
    scoreConfInputs: { areaOk: false, nComps: 6, atipico: false, venalOk: true }, // F5 ZAP-01/02: saída real computada no teste
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
    // C-02: número seguido de ponto final de frase — a matrícula NÃO pode capturar o ponto terminal.
    pontoFinal: {
      texto: "Imóvel objeto da Matrícula nº 45.678. Registrado no 1º Ofício de Registro de Imóveis.",
      expectMatriculaExact: "45.678",
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

    // F5 (auditoria Fable 5) — família do extenso: C-10 (escala bilhão), DOC-01 (gramática do "e"
    // entre grupos de escala), DOC-02 (coerência numeral↔extenso no arredondamento) e C-11
    // ("de reais" nunca com centavos). São os casos que teriam pego os 4 defeitos.
    // C-10: >= 1 bilhão — antes saía "R$ 1.000.000.000,00 ( milhões de reais)" (extenso vazio).
    umBilhao: { valor: 1000000000, expectContains: ["R$ 1.000.000.000,00", "um bilhão de reais"], expectNotContains: ["( milhões", "( reais"] },
    doisBilhoesEMeio: { valor: 2500000000, expectContains: ["R$ 2.500.000.000,00", "dois bilhões e quinhentos milhões de reais"], expectNotContains: ["( milhões"] },
    // borda imediatamente abaixo do bilhão: grupos justapostos, sem "e" entre milhões/mil/centenas.
    bordaBilhao: { valor: 999999999, expectContains: ["R$ 999.999.999,00", "novecentos e noventa e nove milhões novecentos e noventa e nove mil novecentos e noventa e nove reais"], expectNotContains: ["milhões e", "mil e novecentos"] },
    // DOC-01: "e" liga APENAS o último grupo e só quando ele é <100 ou centena exata.
    umMilhaoQuebrado: { valor: 1234567, expectContains: ["R$ 1.234.567,00", "um milhão duzentos e trinta e quatro mil quinhentos e sessenta e sete reais"], expectNotContains: ["milhão e", "mil e quinhentos"] },
    milQuebrado: { valor: 1234, expectContains: ["mil duzentos e trinta e quatro reais"], expectNotContains: ["mil e duzentos"] },
    milEUm: { valor: 1001, expectContains: ["mil e um reais"] }, // <100: o "e" é obrigatório
    doisMilhoesEMeio: { valor: 2500000, expectContains: ["dois milhões e quinhentos mil reais"], expectNotContains: ["de reais"] }, // centena exata: "e" obrigatório; não é múltiplo de 1e6 → sem "de"
    // DOC-02: arredondamento a 2 casas ANTES de separar inteiro — numeral e extenso derivam do MESMO valor-base.
    arredondaCoerente: { valor: 999995.999, expectContains: ["R$ 999.996,00", "novecentos e noventa e nove mil novecentos e noventa e seis reais"], expectNotContains: ["noventa e cinco reais"] },
    // C-11: "de reais" afirma quantia redonda — nunca quando há centavos.
    milhaoComCentavos: { valor: 1000000.5, expectContains: ["R$ 1.000.000,50", "um milhão"], expectNotContains: ["de reais"] },
    // guard honesto: fora da escala representável (>= 1e15), "" — nunca parêntese quebrado.
    foraDeEscala: { valor: 1e15, expectEmpty: true },
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

  // statusDeUnidade (Fase 13, 13-01, VIS-01/PIN-01): mapeia score -> 'bom'|'atencao'|'risco'|'semdado'
  // usando as MESMAS bandas 66/33 de scoreOportunidade (Fase 9) — nunca reimplementa os limiares.
  // Aceita {op:{score}} OU numero direto; score ausente/invalido -> 'semdado', nunca lanca excecao.
  statusDeUnidadeCasos: [
    { input: { op: { score: 78 } }, esperado: "bom" }, // score >= 66
    { input: { op: { score: 66 } }, esperado: "bom" }, // limite exato da banda, inclusive
    { input: { op: { score: 65 } }, esperado: "atencao" }, // 1 abaixo do limite bom
    { input: { op: { score: 50 } }, esperado: "atencao" }, // 33 <= score < 66
    { input: { op: { score: 33 } }, esperado: "atencao" }, // limite exato da banda, inclusive
    { input: { op: { score: 32 } }, esperado: "risco" }, // 1 abaixo do limite atencao
    { input: { op: { score: 0 } }, esperado: "risco" },
    { input: { op: null }, esperado: "semdado" }, // score ainda nao calculado
    { input: { op: undefined }, esperado: "semdado" },
    { input: null, esperado: "semdado" },
    { input: undefined, esperado: "semdado" },
    { input: {}, esperado: "semdado" }, // objeto sem campo op
    { input: NaN, esperado: "semdado" }, // nunca propaga NaN
    { input: 78, esperado: "bom" }, // forma numero direto, sem wrapper op
    { input: 33, esperado: "atencao" }, // forma numero direto, limite inclusive
    { input: -5, esperado: "risco" }, // numero negativo tratado como risco, nunca excecao
    { input: "78", esperado: "semdado" }, // string nao-numerica pura nunca e coagida silenciosamente
  ],

  // Fase 15 (15-01, TERR-01/03): fixtures das 8 funcoes puras de estatistica de territorio
  // (pm2Lote/quantilAmostra/breaksQuantil/binQuantil/anoMedianoCadastro/mixUso/estatTerritorio/
  // rotuloAmostra), novas no bloco RADAR_PURE. Contrato de HONESTIDADE: areaedif=null/0/ausente
  // NUNCA e tratado como dado real; dtinclusao invalido/sentinela/ausente e DESCARTADO antes da
  // mediana; mix com >3 usos agrupa o resto em "Outros".
  TERR_FIX: {
    pm2Lote: [
      // edificado (areaedif>0) usa areaedif -> 300000/100 = 3000
      { a: { vlvenal: 300000, areaedif: 100 }, out: 3000 },
      // areaedif=0 (terreno vago, NAO e dado real) -> cai para areaterr -> 200000/400 = 500
      { a: { vlvenal: 200000, areaedif: 0, areaterr: 400 }, out: 500 },
      // sem venal -> null
      { a: { vlvenal: 0, areaterr: 400 }, out: null },
      // sem area nenhuma (null/null) -> null
      { a: { vlvenal: 100000, areaedif: null, areaterr: null }, out: null },
      // area totalmente ausente (undefined) -> null
      { a: { vlvenal: 100000 }, out: null },
    ],

    quantilAmostra: [
      { sorted: [10, 20, 30, 40], p: 0.5, out: 25 }, // interpolacao linear, mesma formula de quant()
    ],

    breaksQuantilCasos: {
      amostraOk: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000], // >=5, 4 cortes crescentes
      amostraCurta: [100, 200, 300], // <5 -> null (nao sustenta 5 faixas)
    },

    binQuantilCasos: {
      breaks: [200, 400, 600, 800], // 5 faixas: <=200->1, <=400->2, <=600->3, <=800->4, >800->5
    },

    // F5 TERR-01: quantis DEGENERADOS — cortes deduplicados (estritamente crescentes, corte igual
    // ao max da amostra descartado); as faixas efetivas encolhem em vez de exibir "R$X–R$X".
    breaksQuantilDegenerados: {
      todosIguais: { sorted: Array.from({ length: 10 }, () => 50), expectBreaks: [] }, // 1 faixa uniforme
      noveIguaisOutlier: { sorted: [...Array.from({ length: 9 }, () => 50), 200], expectBreaks: [50] }, // 2 faixas
      seteUnsUmCem: { sorted: [1, 1, 1, 1, 1, 1, 1, 100], expectBreaks: [1] }, // 2 faixas
    },

    // dtinclusao: valido (20100101/20120101/20180909) + invalido (sentinela "00000000",
    // null, ausente) — os 3 invalidos sao DESCARTADOS antes da mediana (nunca 0/NaN).
    anoMedianoCadastroCasos: {
      mistoValidoInvalido: {
        lotes: [
          { dtinclusao: "20100101" },
          { dtinclusao: "20120101" },
          { dtinclusao: "20180909" },
          { dtinclusao: "00000000" }, // sentinela — descartado
          { dtinclusao: null }, // ausente — descartado
          {}, // sem o campo — descartado
        ],
        expectAno: 2012, // mediana de [2010,2012,2018] (n=3, sem interpolacao) = 2012
      },
      todosInvalidos: {
        lotes: [{ dtinclusao: "00000000" }, { dtinclusao: null }, {}],
        expectAno: null,
      },
    },

    // mix de uso com >3 categorias presentes: top-3 por contagem + "Outros" somando o resto.
    mixUsoCasos: {
      maisDe3Usos: {
        // uso1 x5, uso2 x3, uso3 x2, uso5 x1, uso6 x1 = total 12 (5 categorias -> top3 + Outros)
        lotes: [
          ...Array.from({ length: 5 }, () => ({ uso: 1 })),
          ...Array.from({ length: 3 }, () => ({ uso: 2 })),
          ...Array.from({ length: 2 }, () => ({ uso: 3 })),
          { uso: 5 },
          { uso: 6 },
        ],
        expectTopLabels: ["Residencial", "Comercial/Serviço", "Industrial"],
        expectOutrosPct: (2 / 12) * 100,
      },
      ate3Usos: {
        // exatamente 3 categorias presentes -> NUNCA adiciona "Outros"
        lotes: [{ uso: 1 }, { uso: 1 }, { uso: 2 }, { uso: 3 }],
        expectLabels: ["Residencial", "Comercial/Serviço", "Industrial"],
      },
      vazio: { lotes: [], expectEmpty: true },
    },

    // estatTerritorio: amostra pequena (3 lotes com pm2/iptu/ano validos + 1 lote sem venal,
    // descartado do pm2/iptu/ano) — coerencia entre as 8 metricas derivadas.
    estatTerritorioCasos: {
      amostraPequena: {
        lotes: [
          { vlvenal: 300000, areaedif: 100, vlimp98: 1000, dtinclusao: "20100101", uso: 1 }, // pm2=3000
          { vlvenal: 400000, areaedif: 100, vlimp98: 1200, dtinclusao: "20120101", uso: 1 }, // pm2=4000
          { vlvenal: 500000, areaedif: 100, vlimp98: 1400, dtinclusao: "20140101", uso: 2 }, // pm2=5000
          { vlvenal: 0, areaterr: 400, vlimp98: 0, dtinclusao: "00000000", uso: 3 }, // sem base -> descartado
        ],
        total: 4000, // total REAL do setor (returnCountOnly) — nunca confundido com n (amostra)
        expect: {
          n: 3,
          total: 4000,
          medianaPm2: 4000,
          q1Pm2: 3500,
          q3Pm2: 4500,
          iptuMediano: 1200,
          anoMediano: 2012,
          breaks: null, // amostra de 3 pm2 validos < 5 -> sem cortes de quantil
        },
      },
    },

    // rotuloAmostra: casos obrigatorios do UI-SPEC — nunca omitido, mesmo com amostra completa.
    rotuloAmostraCasos: [
      { n: 6000, total: 57225, out: "Amostra de 6.000 de 57.225 lotes" },
      { n: 1842, total: 1842, out: "Amostra de 1.842 de 1.842 lotes" },
    ],

    // scoresDePlot (Fase 13, fix CR-01 13-REVIEW.md): score "de plot" p/ colorir o pino no fluxo
    // ficha-FECHADA, SEM rede — reusa a amostra do território já em memória. Contrato: 1 entrada
    // por ci; lote barato (pm2 < mediana) -> score alto (bom); lote caro -> score baixo (risco);
    // lote sem pm2 -> op null; amostra <3 -> {} (nunca inventa cor).
    scoresDePlotCasos: {
      // scan cru: 3 lotes -> estatTerritorio interno (pm2s 3000/4000/5000; med=4000, q1=3500, q3=4500)
      scanOk: {
        lotes: [
          { vlvenal: 300000, areaedif: 100 },
          { vlvenal: 400000, areaedif: 100 },
          { vlvenal: 500000, areaedif: 100 },
        ],
        total: 3,
      },
      lotesParaColorir: [
        { ci: "barato", vlvenal: 300000, areaedif: 100 }, // pm2=3000, abaixo da mediana -> bom
        { ci: "caro", vlvenal: 500000, areaedif: 100 }, // pm2=5000, acima da mediana -> risco
        { ci: "semdado", vlvenal: 0, areaterr: 100 }, // pm2 null -> op null (nunca inventa)
      ],
      // amostra de 2 lotes (n<3) -> scoresDePlot devolve {} mesmo com lotes válidos (honestidade)
      scanCurto: {
        lotes: [
          { vlvenal: 300000, areaedif: 100 },
          { vlvenal: 500000, areaedif: 100 },
        ],
        total: 2,
      },
    },
  },

  // Fase 16 (16-01, TERR-04): fixtures do Detector de Lote Subutilizado. Contrato de HONESTIDADE
  // (Pitfall 1, 16-RESEARCH.md): areaedif===0 (terreno vago REAL) INCLUI no detector;
  // areaedif==null/undefined (registro incompleto) EXCLUI SEMPRE — nunca `?:`/`||0` na guarda.
  DETECTOR_FIX: {
    medianasPorQuadra: {
      lotes: [
        // quadra "10": 2 lotes com pm2 valido -> mediana = (1000+1400)/2 = 1200
        { nrquadra: "10", vlvenal: 100000, areaedif: 100, areaterr: 100 }, // pm2=1000
        { nrquadra: "10", vlvenal: 140000, areaedif: 100, areaterr: 100 }, // pm2=1400
        // quadra "20": 1 lote valido + 1 lote SEM pm2 valido (vlvenal=0) -> ignorado, mediana=2000
        { nrquadra: "20", vlvenal: 200000, areaedif: 100, areaterr: 100 }, // pm2=2000
        { nrquadra: "20", vlvenal: 0, areaedif: 100, areaterr: 100 }, // pm2 null -> ignorado
        // lote sem nrquadra (null) -> nunca agrupado, nunca cria quadra "null"/"undefined"
        { nrquadra: null, vlvenal: 500000, areaedif: 100, areaterr: 100 },
        // quadra "30": nenhum lote com pm2 valido -> a quadra NAO aparece no resultado
        { nrquadra: "30", vlvenal: 0, areaterr: 100 },
      ],
      expect: { "10": 1200, "20": 2000 },
    },

    limiarQuadraValorizada: {
      // <4 quadras distintas nao sustenta um quartil informativo -> null, nunca inventa limiar
      menosDe4: {
        medianas: { "10": 1000, "20": 2000, "30": 3000 },
        expect: null,
      },
      // >=4 quadras distintas -> Q3 da distribuicao de MEDIANOS (nao dos pm2 individuais)
      quatroOuMais: {
        medianas: { A: 1000, B: 1200, C: 1300, D: 9000, E: 9500 },
        expect: 9000, // quantilAmostra([1000,1200,1300,9000,9500],.75) -> i=3 exato, sem interpolacao
      },
    },

    // razaoOcupacao: borda 0-vs-null (Pitfall 1) — mesma areaterr, resultado OPOSTO conforme
    // areaedif seja 0 real (terreno vago, INCLUI) ou null/undefined (dado incompleto, EXCLUI).
    razaoOcupacao: [
      { a: { areaedif: 0, areaterr: 400 }, out: 0 }, // terreno vago REAL -> 0 (candidato)
      { a: { areaedif: null, areaterr: 400 }, out: null }, // registro incompleto -> excluido
      { a: { areaedif: undefined, areaterr: 400 }, out: null }, // idem, ausente
      { a: { areaterr: 400 }, out: null }, // areaedif nem presente no objeto -> ausente -> null
      { a: { areaedif: 380, areaterr: 400 }, out: 0.95 }, // ocupacao alta -> nao candidato
      { a: { areaedif: 30, areaterr: 400 }, out: 0.075 }, // ocupacao baixa -> candidato
      { a: { areaedif: 100, areaterr: 0 }, out: null }, // terreno ausente/zero -> sem razao calculavel
      { a: { areaedif: 100, areaterr: null }, out: null },
    ],

    // detectarSubutilizados: cenario completo com 5 quadras distintas (Q3 existe). B1/B2/B3 =
    // baixo valor (fora do quartil superior); V1/V2 = valorizadas (mediana >= limiar). Cada
    // quadra valorizada tem lotes "background" (ocupacao alta, define a mediana) + candidatos
    // (vago/baixo-aproveitamento/incompleto) — a quantidade de background e alta o suficiente
    // para a mediana da quadra nao ser arrastada pelos candidatos de pm2 baixo (fallback p/
    // areaterr quando areaedif e 0/ausente).
    detectarSubutilizados: {
      lotes: [
        // B1 (baixo valor, mediana=1000): 3 background + 1 "vago" (nao muda a mediana, n=4)
        { ci: "b1a", nrquadra: "B1", vlvenal: 100000, areaedif: 100, areaterr: 100 },
        { ci: "b1b", nrquadra: "B1", vlvenal: 100000, areaedif: 100, areaterr: 100 },
        { ci: "b1c", nrquadra: "B1", vlvenal: 100000, areaedif: 100, areaterr: 100 },
        // terreno vago numa quadra de BAIXO valor -> NUNCA candidato (fora do quartil superior)
        { ci: "b1-vago", nrquadra: "B1", vlvenal: 100000, areaedif: 0, areaterr: 400 },
        // B2 (baixo valor, mediana=1200)
        { ci: "b2a", nrquadra: "B2", vlvenal: 120000, areaedif: 100, areaterr: 100 },
        { ci: "b2b", nrquadra: "B2", vlvenal: 120000, areaedif: 100, areaterr: 100 },
        { ci: "b2c", nrquadra: "B2", vlvenal: 120000, areaedif: 100, areaterr: 100 },
        // B3 (baixo valor, mediana=1300)
        { ci: "b3a", nrquadra: "B3", vlvenal: 130000, areaedif: 100, areaterr: 100 },
        { ci: "b3b", nrquadra: "B3", vlvenal: 130000, areaedif: 100, areaterr: 100 },
        { ci: "b3c", nrquadra: "B3", vlvenal: 130000, areaedif: 100, areaterr: 100 },
        // V1 (valorizada, mediana=9000): 5 background + 3 candidatos/guarda de qualidade
        { ci: "v1a", nrquadra: "V1", vlvenal: 900000, areaedif: 100, areaterr: 100 },
        { ci: "v1b", nrquadra: "V1", vlvenal: 900000, areaedif: 100, areaterr: 100 },
        { ci: "v1c", nrquadra: "V1", vlvenal: 900000, areaedif: 100, areaterr: 100 },
        { ci: "v1d", nrquadra: "V1", vlvenal: 900000, areaedif: 100, areaterr: 100 },
        { ci: "v1e", nrquadra: "V1", vlvenal: 900000, areaedif: 100, areaterr: 100 },
        // terreno vago REAL em quadra valorizada -> candidato, razao=0 (mais subutilizado)
        { ci: "v1-vago", nrquadra: "V1", vlvenal: 300000, areaedif: 0, areaterr: 400 },
        // ocupacao alta (razao 0.95) -> NAO candidato (razao > razaoMax)
        { ci: "v1-alto", nrquadra: "V1", vlvenal: 300000, areaedif: 380, areaterr: 400 },
        // areaedif ausente (undefined, nem a chave existe) -> registro incompleto -> NUNCA candidato
        { ci: "v1-undefined", nrquadra: "V1", vlvenal: 300000, areaterr: 400 },
        // V2 (valorizada, mediana=9500): 5 background + 2 candidatos/guarda de qualidade
        { ci: "v2a", nrquadra: "V2", vlvenal: 950000, areaedif: 100, areaterr: 100 },
        { ci: "v2b", nrquadra: "V2", vlvenal: 950000, areaedif: 100, areaterr: 100 },
        { ci: "v2c", nrquadra: "V2", vlvenal: 950000, areaedif: 100, areaterr: 100 },
        { ci: "v2d", nrquadra: "V2", vlvenal: 950000, areaedif: 100, areaterr: 100 },
        { ci: "v2e", nrquadra: "V2", vlvenal: 950000, areaedif: 100, areaterr: 100 },
        // baixo aproveitamento (razao 0.075) -> candidato
        { ci: "v2-baixo", nrquadra: "V2", vlvenal: 300000, areaedif: 30, areaterr: 400 },
        // areaedif===null (registro incompleto explicito) -> NUNCA candidato
        { ci: "v2-incompleto", nrquadra: "V2", vlvenal: 300000, areaedif: null, areaterr: 400 },
      ],
      expectLimiar: 9000,
      // ordenado por razao crescente: v1-vago (0) primeiro, depois v2-baixo (0.075)
      expectOrdemCi: ["v1-vago", "v2-baixo"],
    },

    // <4 quadras distintas -> limiarQuadraValorizada null -> detectarSubutilizados retorna [],
    // mesmo com candidatos de razao 0 aparentemente fortes (amostra insuficiente = honestidade)
    detectarSubutilizadosAmostraInsuficiente: {
      lotes: [
        { ci: "x1", nrquadra: "X", vlvenal: 900000, areaedif: 0, areaterr: 400 },
        { ci: "x2", nrquadra: "Y", vlvenal: 800000, areaedif: 0, areaterr: 400 },
        { ci: "x3", nrquadra: "Z", vlvenal: 700000, areaedif: 0, areaterr: 400 },
      ],
    },

    leituraDetector: [
      { item: { areaedif: 0 }, out: "🏗️ Terreno vago em quadra valorizada" },
      { item: { areaedif: 50 }, out: "🏗️ Baixo aproveitamento em quadra valorizada" },
    ],
  },

  // Fase 16 (16-01, TERR-05): fixtures das funcoes puras de decisao do Caderno. Contrato de
  // LGPD (Pitfall 2, 16-RESEARCH.md): sanitizeCaderno e uma ALLOWLIST POSITIVA — so os campos
  // de CADERNO_ALLOW sobrevivem; dtnascimen/cpf/nome/campo-desconhecido NUNCA passam, mesmo
  // presentes no objeto de entrada.
  CADERNO_FIX: {
    itemValido: {
      ci: "123456",
      cdbairro: 16,
      nrquadra: "10",
      nrlote: "5",
      vlvenal: 200000,
      areaedif: 100,
      areaterr: 200,
      uso: 1,
      endereco: "Rua Teste, 123",
    },
    itemComPII: {
      ci: "123456",
      cdbairro: 16,
      nrquadra: "10",
      nrlote: "5",
      vlvenal: 200000,
      areaedif: 100,
      areaterr: 200,
      uso: 1,
      endereco: "Rua Teste, 123",
      dtnascimen: "1980-01-01",
      cpf: "00000000000",
      nmproprie: "Fulano de Tal",
      campoInventado: "x",
    },
    importValido: [
      { ci: "111", cdbairro: 16, vlvenal: 100000, areaedif: 100, areaterr: 100, uso: 1 },
      { ci: "222", cdbairro: 16, vlvenal: 200000, areaedif: 100, areaterr: 100, uso: 1 },
    ],
    importMalformado: "{isso nao e json valido",
    importItemSemCi: [{ cdbairro: 16, vlvenal: 100000, areaedif: 100, areaterr: 100 }], // sem `ci` -> descartado
    // CR-01 (16-REVIEW.md): ci com aspas simples/duplas ou marcacao <script> — se sobrevivesse,
    // quebraria o literal de string JS dentro de onclick/onblur inline em renderCadernoBlock().
    // sanitizeCaderno deve REJEITAR o item inteiro (nunca "limpar" o valor e aceitar mesmo assim).
    importItemCiMalicioso: [
      { ci: "x');alert(document.cookie);('", cdbairro: 16, vlvenal: 100000, areaedif: 100, areaterr: 100 },
      { ci: '10"><script>alert(1)</script>', cdbairro: 16, vlvenal: 100000, areaedif: 100, areaterr: 100 },
      { ci: "3020150346", cdbairro: 16, vlvenal: 100000, areaedif: 100, areaterr: 100 }, // ci valido, no MESMO import — deve sobreviver
    ],
    // WR-03 (16-REVIEW.md): tag/nota gigantes (bem acima do maxlength=40/500 do HTML) — vindas de
    // um import/atribuicao programatica, nunca protegidas pelo atributo do <input>/<textarea>.
    // sanitizeCaderno deve truncar, nunca aceitar o tamanho cru.
    itemTagNotaGigante: {
      ci: "444",
      cdbairro: 16,
      tag: "T".repeat(200),
      nota: "N".repeat(2000),
    },
    // WR-03: status fora do enum fixo (nunca deveria acontecer via UI, mas import/chamador
    // futuro pode mandar qualquer string) -> sanitizeCaderno normaliza para "nao_visitado".
    itemStatusInvalido: {
      ci: "555",
      cdbairro: 16,
      status: "status-inventado",
    },
    importItemComPII: [
      {
        ci: "333",
        cdbairro: 16,
        vlvenal: 300000,
        areaedif: 100,
        areaterr: 100,
        dtnascimen: "1990-05-05",
        cpf: "11111111111",
      },
    ],

    // Fase 17 (17-01, TERR-06): fixtures de snapshot LGPD — sanitizeCaderno agora reconstroi
    // out.snapshot campo-a-campo por DIFF_ALLOW (allowlist RECURSIVA, Pitfall 5/T-17-01
    // 17-RESEARCH.md); snapshot.dtnascimen/cpf NUNCA sobrevivem mesmo com a chave "snapshot" na
    // allowlist de topo (CADERNO_ALLOW so filtra a CHAVE, nao o CONTEUDO aninhado).
    itemComSnapshot: {
      ci: "666",
      cdbairro: 16,
      snapshot: { vlvenal: 200000, areaedif: 100, vlimp98: 1000, uso: 1, dtinclusao: "20100101" },
      snapshotAt: "2026-07-09T12:00:00.000Z",
    },
    itemSnapshotComPII: {
      ci: "777",
      cdbairro: 16,
      snapshot: { vlvenal: 1, dtnascimen: "1980-01-01", cpf: "00000000000" },
    },
    itemSnapshotMalformado: {
      ci: "888",
      cdbairro: 16,
      snapshot: "x", // string, nao objeto plano -> out.snapshot deve ficar ausente
    },
    itemSnapshotArray: {
      ci: "889",
      cdbairro: 16,
      snapshot: [1, 2, 3], // array -> mesmo tratamento de malformado (ausente)
    },
    itemSnapshotAtInvalido: {
      ci: "890",
      cdbairro: 16,
      snapshot: { vlvenal: 1 },
      snapshotAt: 12345, // nao-string -> descartado, snapshot em si sobrevive
    },
    itemSemSnapshot: {
      // formato antigo (pre-Fase 17) — continua valido, retrocompativel.
      ci: "891",
      cdbairro: 16,
      vlvenal: 100000,
    },
    importComSnapshotPII: [
      {
        ci: "999",
        cdbairro: 16,
        vlvenal: 300000,
        snapshot: { vlvenal: 300000, dtnascimen: "1990-05-05", cpf: "11111111111" },
      },
    ],
  },

  // Fase 17 (17-01, TERR-06): fixtures de diffLote/formatarDiff — pares snapshot/atual cobrindo
  // pct (vlvenal/vlimp98, threshold 1%), area (areaedif, 0->N/N->0/N->M/ruido <1m2), categorico
  // (uso/dtinclusao) e o caso honesto "sem mudanca relevante -> []" (nunca lanca, campo
  // ausente/null tratado como sem mudanca). formatarDiff usa dataFmt fixo "10/05" (UI-SPEC).
  DIFF_FIX: {
    vlvenalSubiu12: {
      snap: { vlvenal: 200000 },
      atual: { vlvenal: 224000 },
      expect: [{ campo: "vlvenal", tipo: "pct", direcao: "subiu", pct: 12 }],
    },
    vlvenalRuido: {
      snap: { vlvenal: 200000 },
      atual: { vlvenal: 201000 }, // +0.5%, abaixo de DIFF_THRESH_PCT=1 -> ignora
      expect: [],
    },
    vlvenalDesceu10: {
      snap: { vlvenal: 200000 },
      atual: { vlvenal: 180000 },
      expect: [{ campo: "vlvenal", tipo: "pct", direcao: "desceu", pct: 10 }],
    },
    vlimp98Subiu: {
      snap: { vlimp98: 1000 },
      atual: { vlimp98: 1200 },
      expect: [{ campo: "vlimp98", tipo: "pct", direcao: "subiu", pct: 20 }],
    },
    vlimp98Desceu: {
      snap: { vlimp98: 1000 },
      atual: { vlimp98: 800 },
      expect: [{ campo: "vlimp98", tipo: "pct", direcao: "desceu", pct: 20 }],
    },
    areaedifNova: {
      snap: { areaedif: 0 },
      atual: { areaedif: 85 },
      expect: [{ campo: "areaedif", tipo: "area", subtipo: "nova", delta: 85 }],
    },
    areaedifDemolicao: {
      snap: { areaedif: 120 },
      atual: { areaedif: 0 },
      expect: [{ campo: "areaedif", tipo: "area", subtipo: "demolicao", delta: 120 }],
    },
    areaedifAumentou: {
      snap: { areaedif: 100 },
      atual: { areaedif: 160 }, // nao cruza zero
      expect: [{ campo: "areaedif", tipo: "area", subtipo: "aumentou", delta: 60 }],
    },
    areaedifDiminuiu: {
      snap: { areaedif: 160 },
      atual: { areaedif: 100 },
      expect: [{ campo: "areaedif", tipo: "area", subtipo: "diminuiu", delta: 60 }],
    },
    areaedifRuido: {
      snap: { areaedif: 100 },
      atual: { areaedif: 100.5 }, // <1m2 -> ruido de arredondamento, nunca entra na lista
      expect: [],
    },
    usoMudou: {
      snap: { uso: 1 },
      atual: { uso: 2 },
      expect: [{ campo: "uso", tipo: "categorico", de: 1, para: 2 }],
    },
    dtinclusaoMudou: {
      snap: { dtinclusao: "20100101" },
      atual: { dtinclusao: "20200101" },
      expect: [{ campo: "dtinclusao", tipo: "categorico" }],
    },
    semMudancaRelevante: {
      // todos os 5 campos identicos entre snap/atual (reabrir a mesma ficha na mesma sessao)
      snap: { vlvenal: 200000, areaedif: 100, vlimp98: 1000, uso: 1, dtinclusao: "20100101" },
      atual: { vlvenal: 200000, areaedif: 100, vlimp98: 1000, uso: 1, dtinclusao: "20100101" },
      expect: [],
    },
    campoAusenteNumLado: {
      // vlvenal so existe no snapshot; atual nao tem o campo -> tratado como "sem mudanca",
      // NUNCA como queda de 100% (diffLote nunca lanca, nunca inventa mudanca de dado incompleto).
      snap: { vlvenal: 200000, uso: 1 },
      atual: { uso: 1 },
      expect: [],
    },
    // F5 CAD-02: categoricos com tipos divergentes (numero no snapshot importado x string da ficha,
    // ou vice-versa) — comparacao tipo-insensivel, NUNCA "Uso mudou de Residencial para Residencial".
    usoMesmoValorTipoDiferente: {
      snap: { uso: 1, dtinclusao: 20240101 },
      atual: { uso: "1", dtinclusao: "20240101" },
      expect: [],
    },
    usoMudouComTipoDiferente: {
      // mudanca REAL continua reportada mesmo com tipos mistos
      snap: { uso: "1" },
      atual: { uso: 2 },
      expect: [{ campo: "uso", tipo: "categorico", de: "1", para: 2 }],
    },
    // F5 CAD-05: transicao 0 -> valor de venal/IPTU reporta (simetrico ao subtipo "nova" de
    // areaedif) — antes era engolida pelo guard de base zero. 0 -> 0 segue sem mudanca.
    vlvenalEntrouNaBase: {
      snap: { vlvenal: 0 },
      atual: { vlvenal: 250000 },
      expect: [{ campo: "vlvenal", tipo: "novo", para: 250000 }],
    },
    vlimp98EntrouNaBase: {
      snap: { vlimp98: 0 },
      atual: { vlimp98: 800 },
      expect: [{ campo: "vlimp98", tipo: "novo", para: 800 }],
    },
    vlvenalZeroParaZero: {
      snap: { vlvenal: 0 },
      atual: { vlvenal: 0 },
      expect: [],
    },
  },

  // formatarDiff: mudancas (shape de diffLote) -> frases comerciais EXATAS do UI-SPEC §Copywriting.
  FORMATAR_DIFF_FIX: {
    dataFmt: "10/05",
    venalSubiu: {
      mudancas: [{ campo: "vlvenal", tipo: "pct", direcao: "subiu", pct: 12 }],
      expect: ["Valor venal subiu 12% desde 10/05"],
    },
    venalDesceu: {
      mudancas: [{ campo: "vlvenal", tipo: "pct", direcao: "desceu", pct: 10 }],
      expect: ["Valor venal desceu 10% desde 10/05"],
    },
    areaedifNova: {
      mudancas: [{ campo: "areaedif", tipo: "area", subtipo: "nova", delta: 85 }],
      expect: ["Área construída: +85 m² — construção nova?"],
    },
    areaedifDemolicao: {
      mudancas: [{ campo: "areaedif", tipo: "area", subtipo: "demolicao", delta: 120 }],
      expect: ["Área construída: -120 m² — demolição?"],
    },
    areaedifAumentou: {
      mudancas: [{ campo: "areaedif", tipo: "area", subtipo: "aumentou", delta: 60 }],
      expect: ["Área construída aumentou 60 m²"],
    },
    areaedifDiminuiu: {
      mudancas: [{ campo: "areaedif", tipo: "area", subtipo: "diminuiu", delta: 60 }],
      expect: ["Área construída diminuiu 60 m²"],
    },
    iptuSubiu: {
      mudancas: [{ campo: "vlimp98", tipo: "pct", direcao: "subiu", pct: 20 }],
      expect: ["IPTU subiu 20% desde 10/05"],
    },
    // F5 CAD-05: frases proprias da transicao 0 -> valor (brlSimples, mesmo formato do resto do app)
    venalNovo: {
      mudancas: [{ campo: "vlvenal", tipo: "novo", para: 250000 }],
      expect: ["Valor venal: passou a ter valor (R$ 250 mil) — imóvel avaliado?"],
    },
    iptuNovo: {
      mudancas: [{ campo: "vlimp98", tipo: "novo", para: 800 }],
      expect: ["IPTU: passou a ter lançamento (R$ 800)"],
    },
    usoMudou: {
      mudancas: [{ campo: "uso", tipo: "categorico", de: 1, para: 2 }],
      expect: ["Uso mudou de Residencial para Comercial/Serviço"],
    },
    dtinclusaoMudou: {
      mudancas: [{ campo: "dtinclusao", tipo: "categorico" }],
      expect: ["Data de cadastro atualizada"],
    },
  },

  // Fase 17 (17-01, TERR-07): fixtures de matching Caixa->cdbairro + cruzamento, com NOMES REAIS
  // extraidos de caixa-goiania.js ("SETOR BUENO", "JARDIM ATLANTICO", "RESIDENCIAL JARDINS DO
  // CERRADO 7"). idParaCd simula bairro-cdbairro.json (id->cd); features simulam bairros-goiania.json
  // (nm_bai/nm_disp). Um nome normalizado pode ter >1 cdbairro (colisao, Pitfall 4) — nunca reduzir
  // a um valor unico.
  CAIXA_MATCH_FIX: {
    idParaCd: { "1": 52, "2": 60, "12": 12, "13": 13 }, // "12"/"13" = colisao de nome (mesmo bairro, 2 zonas)
    features: [
      { properties: { id: "1", nm_bai: "SETOR BUENO", nm_disp: "Setor Bueno" } },
      { properties: { id: "2", nm_bai: "JD ATLANTICO", nm_disp: "Jardim Atlântico" } },
      { properties: { id: "12", nm_bai: "SANTA GENOVEVA", nm_disp: "Santa Genoveva" } }, // colisao
      { properties: { id: "13", nm_bai: "SANTA GENOVEVA", nm_disp: "Santa Genoveva" } }, // colisao
      { properties: { id: "99", nm_bai: "SEM CD", nm_disp: "Sem Cd" } }, // sem cd em idParaCd -> nunca entra no map
    ],
    imoveisCaixa: {
      setorBuenoComXY: { id: "c1", b: "SETOR BUENO", x: 690000, y: 8150000 },
      setorBuenoSemXY: { id: "c2", b: "SETOR BUENO" }, // sem x/y -> nunca cruzavel
      jardinsCerrado7SemMatch: { id: "c3", b: "RESIDENCIAL JARDINS DO CERRADO 7", x: 691000, y: 8151000 },
      santaGenovevaColisao: { id: "c4", b: "SANTA GENOVEVA", x: 692000, y: 8152000 },
    },
  },

  // Fase 18 (18-01, PD-01): fixtures das respostas sintéticas das 9 layers do Modelo Espacial,
  // no formato Promise.allSettled-shaped consumido por resolverZonaUI — {layer, status, value}.
  // Layers seguem as chaves de PD_LAYERS (macrozona/aa/add/aos/aeis/apac/ooau/eixo/corredor).
  // A fixture "macrozonaSemUnidade" cobre o 6º estado (BLOCKER 2, 18-01-PLAN.md): macrozona
  // Construída resolvida, mas NENHUMA das layers AA/ADD/AOS intersectou (lote urbano em AAB).
  PD_FIX: (() => {
    const LAYER_KEYS = ["macrozona", "aa", "add", "aos", "aeis", "apac", "ooau", "eixo", "corredor"];
    function vazio() {
      return { features: [] };
    }
    function comFeature(attrs) {
      return { features: [{ attributes: attrs }] };
    }
    // baseTodasFulfilled: 9 entradas fulfilled com value vazio (sem feature) — ponto de partida
    // para as fixtures que só precisam sobrescrever 1-2 layers específicas.
    function baseTodasFulfilled(overrides) {
      return LAYER_KEYS.map((layer) => ({
        layer,
        status: "fulfilled",
        value: (overrides && overrides[layer]) || vazio(),
      }));
    }
    return {
      respostas: {
        // todas resolvidas, macrozona Construída, AA presente -> estado "resolvido"
        aaResolvido: baseTodasFulfilled({
          macrozona: comFeature({ nm_mzo: "MACROZONA CONSTRUIDA" }),
          aa: comFeature({ sigla: "AA", nm_des: "AREA ADENSAVEL" }),
        }),
        // todas resolvidas, macrozona Construída, NENHUMA das AA/ADD/AOS intersectou (6º estado)
        macrozonaSemUnidade: baseTodasFulfilled({
          macrozona: comFeature({ nm_mzo: "MACROZONA CONSTRUIDA" }),
        }),
        // macrozona rural (nome não contém "CONSTRU") -> estado "rural"
        rural: baseTodasFulfilled({
          macrozona: comFeature({ nm_mzo: "MACROZONA RURAL" }),
        }),
        // TODAS as 9 falharam -> estado "erro"
        todasFalharam: LAYER_KEYS.map((layer) => ({ layer, status: "rejected", value: null })),
        // mix: macrozona/AA resolvidos, mas 1 layer falhou (corredor) -> estado "parcial"
        parcial: baseTodasFulfilled({
          macrozona: comFeature({ nm_mzo: "MACROZONA CONSTRUIDA" }),
          aa: comFeature({ sigla: "AA", nm_des: "AREA ADENSAVEL" }),
        }).map((r) => (r.layer === "corredor" ? { layer: "corredor", status: "rejected", value: null } : r)),
        // AEIS presente junto de AA -> badges.aeis===true; OOAU consultada mas SEM badge
        comAeis: baseTodasFulfilled({
          macrozona: comFeature({ nm_mzo: "MACROZONA CONSTRUIDA" }),
          aa: comFeature({ sigla: "AA", nm_des: "AREA ADENSAVEL" }),
          aeis: comFeature({ sigla: "AEIS", nm_des: "AREA ESPECIAL DE INTERESSE SOCIAL" }),
          ooau: comFeature({ nm_des: "OUTORGA ONEROSA DE ALTERACAO DE USO" }),
        }),
        // WR-02 (18-REVIEW.md): unidade resolvida É a ADD (só a layer `add` intersectou) ->
        // badges.add deveria ser suprimido (redundante com a própria Unidade Territorial).
        addResolvido: baseTodasFulfilled({
          macrozona: comFeature({ nm_mzo: "MACROZONA CONSTRUIDA" }),
          add: comFeature({ sigla: "ADD", nm_des: "AREA DE DESACELERACAO DE DENSIDADE" }),
        }),
        // WR-03 (18-REVIEW.md): AA e ADD AMBOS presentes (sobreposição de borda/imprecisão de
        // snapping) -> precedência FIXA AA > ADD > AOS deveria vencer com unidade AA, e o badge
        // `add` continua true (a layer `add` de fato intersectou, e a unidade NÃO é ADD).
        aaAddSobreposto: baseTodasFulfilled({
          macrozona: comFeature({ nm_mzo: "MACROZONA CONSTRUIDA" }),
          aa: comFeature({ sigla: "AA", nm_des: "AREA ADENSAVEL" }),
          add: comFeature({ sigla: "ADD", nm_des: "AREA DE DESACELERACAO DE DENSIDADE" }),
        }),
      },
    };
  })(),
};
