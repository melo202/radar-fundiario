# Base jurídica determinística dos documentos gerados

Pesquisa consolidada em 22/07/2026 (fontes: Resolução-COFECI 1.066/2007 e Ato
Normativo 001/2008 via crecipr.gov.br e intranet.cofeci.gov.br; Código Civil;
Lei 6.530/78; LGPD 13.709/2018). Este documento é a REGRA do que o sistema pode
gerar, em que condições, e o que NUNCA pode sair sem travamento. Nenhuma linha
aqui é opinião: tudo remete a norma citada.

---

## 1. O que JÁ existe e está blindado: a ACM (documento.js)

A **Análise Comparativa de Mercado** do motor já cumpre o contrato de honestidade:

- Rótulo "PTAM" travado propositalmente — o documento se chama ACM
- Disclaimer: "não substitui laudo de avaliação por profissional habilitado
  (PTAM — Res. COFECI 1.066/2007)" — citação verificada contra o texto oficial
- "Ofertas ≠ transações" em todo documento
- Bloco de assinatura com CRECI em branco (o corretor assina e responde)
- Funil da amostra contabilizado, razões de exclusão registradas, versão
  encadeada, id auditável

**Veredito: aprovado, manter como está.**

---

## 2. Caminho de upgrade: ACM → PTAM (Res. COFECI 1.066/2007)

Descoberta da pesquisa (Art. 6º da Resolução): **todo corretor de imóveis pessoa
física, regularmente inscrito no CRECI, pode elaborar PTAM** — a inscrição no
CNAI é opcional e só concede o selo certificador (credibilidade extra, não
validade). Ou seja: a trava atual é MAIS restrita que a lei. O caminho legal:

Requisitos mínimos do PTAM (Art. 5º + Anexo IV) — viram CAMPOS OBRIGATÓRIOS
determinísticos, sem os quais o sistema NÃO emite:

1. Identificação do solicitante
2. Objetivo/finalidade do parecer
3. Identificação e caracterização do imóvel:
   - proprietário identificado
   - número da matrícula no Cartório de Registro de Imóveis
   - endereço completo
   - áreas e dimensões
   - **data da vistoria** + relatório fotográfico
4. Metodologia utilizada (Método Comparativo Direto de Dados de Mercado — é o
   que o motor já faz; a homogeneização precisa ser DOCUMENTADA no texto)
5. Valor resultante e sua data de referência
6. Identificação, breve currículo e assinatura do corretor com CRECI

Regra determinística: o botão "Emitir como PTAM" só aparece quando TODOS os
campos estão preenchidos E o usuário confirmou seu CRECI. Sem isso, o documento
sai como ACM (que é o correto legalmente). Referências técnicas da avaliação:
NBR 14653-1/2/3 (ABNT), citadas na própria Resolução; CDC art. 39, VIII obriga
serviço conforme norma técnica.

---

## 3. Proposta de compra e venda (NÃO EXISTE — especificação)

Documento que o comprador assina ofertando preço e condições. Cláusulas
OBRIGATÓRIAS (template travado, campos preenchidos do banco):

1. **Partes**: comprador (nome/CPF), proprietário (nome/CPF), corretor com CRECI
2. **Imóvel**: matrícula RGI + endereço + inscrição imobiliária municipal
   (o sistema JÁ TEM inscrição/quadra/lote — usar como camada de conferência)
3. **Preço e forma de pagamento** (à vista/financiamento/parcelado)
4. **Validade da proposta**: prazo determinado (padrão 5 dias úteis)
5. **Condições suspensivas**: aprovação de financiamento, análise documental do
   imóvel e do vendedor, vistoria
6. **Arras (se houver)** — CC arts. 417-420: tipo DECLARADO explicitamente
   (confirmatórias ou penitenciais). Se penitenciais: direito de arrependimento
   com perda do sinal (comprador) ou devolução em DOBRO (vendedor). Nunca deixar
   arras implícita — é a maior fonte de litígio
7. **Comissão de corretagem** — CC arts. 722-729: percentual/valor, quem paga,
   fato gerador
8. **Custas**: ITBI, escritura, registro — quem paga o quê (campo, sem taxa
   embutida: alíquotas mudam por município)
9. **LGPD**: finalidade do tratamento dos dados pessoais no documento
10. **Assinaturas**: partes + 2 testemunhas

Regras travadas: sem geração sem matrícula RGI; sem envio automático — o
corretor revisa antes (mesmo padrão "confirma antes de salvar" do OS);
disclaimer não removível: "minuta padrão — a revisão por advogado é recomendada
para adequação ao caso concreto".

---

## 4. Compromisso particular de compra e venda (NÃO EXISTE — especificação)

Documento pesado, maior risco jurídico do sistema. Regras determinísticas:

- Template com as mesmas cláusulas da proposta + cronograma de pagamento,
  posse, inadimplemento, rescisão, foro
- **Aviso de registro travado**: o compromisso sem registro na matrícula do
  imóvel (Lei de Registros Públicos) só vale entre as partes — é o chamado
  "contrato de gaveta", exposto a venda para terceiro, penhora e disputa de
  titularidade. O documento deve SEMPRE exibir este aviso
- Vendedor pessoa jurídica (incorporador/construtor): alerta de que o CDC se
  aplica à relação (regime de proteção do consumidor) — texto específico
- Disclaimer maior que o da proposta: "minuta-base educativa — este instrumento
  transfere direitos relevantes; não assine sem revisão jurídica"
- Assinaturas com reconhecimento de firma recomendado (nota no rodapé)

---

## 5. Autorização de divulgação (fecha o ciclo com a tarefa do OS)

O OS já cria a tarefa "Solicitar autorização de divulgação" — mas não gera o
documento. Template curto e travado:

- Proprietário autoriza o corretor (CRECI) a divulgar o imóvel X pelo preço Y,
  pelo prazo Z, nos canais listados
- Comissão combinada registrada
- Consentimento LGPD explícito (dados do proprietário e do imóvel nos anúncios)
- Revogável a qualquer tempo por escrito

Princípio deontológico: corretor não anuncia imóvel sem autorização do
proprietário — o sistema deve exigir este documento (ou registro equivalente)
antes de marcar um imóvel como "divulgável".

---

## 6. Regras transversais (valem para TODO documento)

1. **Determinístico primeiro**: dados vêm do banco (imóvel, proprietário,
   preços, comparáveis) — nunca digitados duas vezes, nunca inventados
2. **IA só na prosa**: textos narrativos (descrição, parecer) passam pelo mesmo
   validador de valores da redação (redacao-validador.js) — número errado não sai
3. **Auditoria total**: todo documento ganha id, hash, versão encadeada e
   registro em audit_log (mesmo contrato da ACM)
4. **Campos obrigatórios bloqueiam a emissão** — sem matrícula, sem CRECI, sem
   vistoria: o documento simplesmente não é gerado
5. **Nada sai automaticamente**: corretor revisa e confirma antes
6. **Disclaimers não removíveis**: cada documento carrega seu aviso legal
7. **LGPD**: finalidade declarada, dados mínimos, consentimento registrado

---

## 7. Status de implementação

| Documento | Status |
|---|---|
| ACM (avaliação) | ✅ em produção, blindado |
| ACM → PTAM | especificado (aguarda gate G1 para implementar) |
| Proposta de compra e venda | especificado (aguarda G1) |
| Compromisso de compra e venda | especificado (aguarda G1) |
| Autorização de divulgação | especificado (aguarda G1) |

Implementação dos geradores é capacidade nova → pós-G1. Esta especificação é a
fundação determinística: quando o gate abrir, é transcrever para código.
