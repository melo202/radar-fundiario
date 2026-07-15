/* SEG-01/02/05 — autenticação do painel do corretor. Medidas copiadas do estudo do
   swisstony-bot (15/07/2026), adaptadas de Flask para Node puro:
   - senha ÚNICA do .env (SEM multitenant — decisão do usuário);
   - hash PBKDF2-HMAC-SHA256 (100_000 iterações) calculado UMA vez na inicialização;
     comparação SEMPRE em tempo constante (timingSafeEqual);
   - sessão por cookie assinado com HMAC (HttpOnly, Secure, SameSite=Lax, 24 h);
   - trava anti-força-bruta: 5 falhas/IP -> 5 min de bloqueio, MAIS teto GLOBAL de 50
     falhas na janela (segura ataque distribuído trocando de IP), com poda dos IPs
     antigos (memória limitada);
   - sem PAINEL_SENHA no .env o painel NEM EXISTE (404) — nunca aberto por engano. */
import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const SENHA = process.env.PAINEL_SENHA || "";
const SAL = randomBytes(16); /* por boot: o hash de referência vive só em memória */
const HASH = SENHA ? pbkdf2Sync(SENHA, SAL, 100_000, 32, "sha256") : null;
/* PAINEL_SECRET no .env mantém as sessões entre deploys; sem ele, segredo por boot
   (deploy derruba as sessões — custo: um re-login) */
const SECRET = process.env.PAINEL_SECRET || randomBytes(32).toString("hex");
const SESSAO_S = 24 * 60 * 60;

export const painelAtivo = () => !!HASH;

export function verificaSenha(s) {
  if (!HASH) return false;
  const d = pbkdf2Sync(String(s || ""), SAL, 100_000, 32, "sha256");
  return timingSafeEqual(d, HASH);
}

const assina = (txt) => createHmac("sha256", SECRET).update(txt).digest("hex");
const igualConstante = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

export function criaSessao() {
  const exp = Math.floor(Date.now() / 1000) + SESSAO_S;
  const nonce = randomBytes(12).toString("hex");
  const corpo = `${exp}.${nonce}`;
  return `${corpo}.${assina(corpo)}`;
}
export const cookieSessao = (token) =>
  `radar_sessao=${token}; Max-Age=${SESSAO_S}; Path=/painel; HttpOnly; Secure; SameSite=Lax`;
export const cookieLimpa = () =>
  "radar_sessao=; Max-Age=0; Path=/painel; HttpOnly; Secure; SameSite=Lax";

export function sessaoDe(req) {
  const m = /(?:^|;\s*)radar_sessao=([^;]+)/.exec(req.headers.cookie || "");
  if (!m) return null;
  const [exp, nonce, sig] = m[1].split(".");
  if (!exp || !nonce || !sig) return null;
  if (!igualConstante(sig, assina(`${exp}.${nonce}`))) return null;
  if (Number(exp) * 1000 < Date.now()) return null;
  return { exp: Number(exp), nonce };
}

/* CSRF double-submit (SEG-04): token derivado da própria sessão, conferido no header
   X-CSRF-Token em todo POST autenticado; o login é isento (SameSite do cookie cobre). */
export const csrfDe = (sessao) => assina(`csrf.${sessao.nonce}`);
export const csrfOk = (req, sessao) =>
  igualConstante(req.headers["x-csrf-token"] || "", csrfDe(sessao));

/* ---- trava anti-força-bruta (SEG-02) ---- */
const TENTATIVAS = new Map();
const GLOBAIS = [];
const MAX_IP = 5, MAX_GLOBAL = 50, JANELA_MS = 300_000;

export function bloqueado(ip) {
  const agora = Date.now();
  while (GLOBAIS.length && agora - GLOBAIS[0] >= JANELA_MS) GLOBAIS.shift();
  if (GLOBAIS.length >= MAX_GLOBAL) return true;
  for (const [addr, ts] of TENTATIVAS) { /* poda dos IPs antigos: memória limitada */
    const vivos = ts.filter(t => agora - t < JANELA_MS);
    if (vivos.length) TENTATIVAS.set(addr, vivos); else TENTATIVAS.delete(addr);
  }
  return (TENTATIVAS.get(ip) || []).length >= MAX_IP;
}
export function registraFalha(ip) {
  if (!TENTATIVAS.has(ip)) TENTATIVAS.set(ip, []);
  TENTATIVAS.get(ip).push(Date.now());
  GLOBAIS.push(Date.now());
}
export const tentativasRestantes = (ip) =>
  Math.max(0, MAX_IP - (TENTATIVAS.get(ip) || []).length);
