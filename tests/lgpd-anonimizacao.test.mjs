// LGPD-01 (P1.7 do roadmap de 18/08/2026): anonimização do titular com cascata.
// Critério de aceite: "titular some, trilha fica". Funcional (id inválido retorna
// ANTES de tocar no banco — prova que a validação é a primeira linha de defesa)
// + contrato de fonte no padrão do repo.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { anonimizarContato } from "../motor/os-core.js";

test("lgpd: id inválido é recusado sem tocar no banco", async () => {
  const r = await anonimizarContato("123-nao-e-uuid");
  assert.equal(r.ok, false);
  assert.match(r.erro, /inválido/);
});

test("lgpd: PII some, vínculo e trilha ficam (contrato de fonte)", () => {
  const os = readFileSync(new URL("../motor/os-core.js", import.meta.url), "utf-8");
  assert.match(os, /export async function anonimizarContato\(contactId\)/);
  /* todos os campos identificadores são apagados na mesma transação */
  assert.ok(os.includes("name='Titular anonimizado (LGPD)'"), "nome vira rótulo neutro");
  assert.match(os, /phone=NULL, email=NULL,\s*document_number=NULL, notes=NULL, metadata='\{\}'::jsonb/,
    "telefone, e-mail, documento, notas e metadata somem juntos");
  assert.ok(os.includes("consent_status='revogado'"), "consentimento revogado no registro");
  assert.ok(os.includes("status='arquivado'"), "arquivado some de TODAS as listagens");
  /* cascata: perfil de busca da pessoa e identificadores na trilha de eventos */
  assert.ok(os.includes("DELETE FROM contact_preferences WHERE contact_id=$1"));
  assert.ok(os.includes(`payload='{"anonimizado":true}'::jsonb`), "eventos do contato viram payload neutro");
  assert.ok(os.includes("payload=payload-'contactName'"), "nome sai dos eventos das oportunidades dele");
  /* a própria anonimização entra na trilha, sem PII no payload */
  assert.ok(os.includes('"contact.anonymized", "contact", contactId, {}'), "evento de auditoria sem PII");
  /* NÃO é DELETE do contato: FKs e histórico de negócios permanecem íntegros */
  const trecho = os.slice(os.indexOf("export async function anonimizarContato"));
  assert.ok(!trecho.includes("DELETE FROM contacts"), "a linha do contato NUNCA é apagada");
  /* idempotente na prática: segunda chamada recebe explicação, não erro feio */
  assert.ok(os.includes("Este contato já foi anonimizado."));
  /* limite honesto declarado: texto livre do assistente não é varrido */
  assert.match(os, /texto livre do assistente[\s\S]{0,120}não são?\s+varrid/);
});

test("lgpd: rota autenticada + botão no front (contrato de fonte)", () => {
  const painel = readFileSync(new URL("../motor/painel.js", import.meta.url), "utf-8");
  assert.match(painel, /POST" && \/\^\\\/painel\\\/api\\\/os\\\/contatos\\\/\[0-9a-f-\]\{36\}\\\/anonimizar\$/,
    "rota POST /painel/api/os/contatos/<uuid>/anonimizar");
  assert.ok(painel.includes("anonimizarContato(req.url.split(\"/\")[5])"));
  /* CSRF: a barreira de todo POST autenticado (linha do csrfOk) cobre a rota nova */
  assert.ok(painel.includes('if (req.method === "POST" && !csrfOk(req, sessao))'));

  const app = readFileSync(new URL("../motor/os-app.js", import.meta.url), "utf-8");
  assert.ok(app.includes('text:"Anonimizar (LGPD)"'), "botão visível no card do relacionamento");
  assert.ok(app.includes("if(!confirm(`Anonimizar ${c.name}?"), "confirmação obrigatória — é irreversível");
  assert.match(app, /api\(`\/painel\/api\/os\/contatos\/\$\{c\.id\}\/anonimizar`,\{method:"POST"/);
  assert.ok(app.includes("O histórico de negócios permanece, sem identificar a pessoa."),
    "o confirm explica o que some e o que fica");
});
