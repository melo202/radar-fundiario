# ADR-001 — Autenticação do Corretor Inteligente OS

- **Status:** DECIDIDO por spike em produção (21/07/2026, Fase 1 aberta pelo G1 aprovado)
- **Decisão:** **Logto self-hosted** no próprio KVM4, via Docker, sobre o Postgres existente.

## Exigências (ROADMAP-OS §6)
OIDC maduro, não-caseiro, custo perto de zero, dados no Brasil. Candidatos: Logto
(favorito a priori), Zitadel, Keycloak, gerenciado (Clerk/Auth0).

## O spike (medições reais, não opinião)
Instalação isolada no VPS de produção em ~30 min:
- Banco `logto` dedicado no Postgres existente (role própria com CREATEROLE — o seeder
  cria roles internas; senha gerada na máquina, vive só em `/opt/radar/logto.env` chmod 600).
- Container `ghcr.io/logto-io/logto:latest`, `--network host` (portas 3001 core / 3002
  admin, só em localhost — nada exposto publicamente ainda), `--restart unless-stopped`,
  entrypoint `sh -c "npm run cli db seed -- --swe && npm start"`.
- **Resultado: seed OIDC ok; `/oidc/.well-known/openid-configuration` → 200; RAM 222 MB
  ociosa; CPU 0,03%.** Headroom do VPS no momento: ~8 GB livres (Ollama capado a 1 núcleo).

## Por que Logto (e não os outros)
- **Keycloak:** JVM ~1 GB no mesmo VPS que roda Ollama — 4–5× o custo de RAM medido do Logto.
- **Zitadel:** fica como plano B declarado; não medido porque o favorito passou com folga.
- **Gerenciado (Clerk/Auth0):** custo recorrente + dados fora do Brasil — contra as exigências.
- **Logto medido:** 222 MB, OIDC completo (authorization/device/token endpoints), console
  de administração próprio, migrações versionadas pelo CLI oficial.

## Pendências para a Fase 1 (na ordem)
1. **Primeiro acesso ao console admin** (cria o admin): túnel `ssh -L 3002:127.0.0.1:3002
   radar-vps` → navegador em `localhost:3002` (não expor o 3002 publicamente).
2. **Endpoint público**: decidir `auth.corretorinteligente.tech` (precisa de registro DNS —
   ação do dono do domínio) e proxy nginx com TLS; até lá, tudo via localhost/túnel.
3. Aplicação OIDC "Corretor Inteligente OS" no Logto + integração no painel (Authorization
   Code + PKCE); a sessão de senha única atual vira acesso administrativo legado (D3).
4. Schema de identidade: `organizations`/`app_users` já existem (migração 006); Fase 1
   adiciona members/roles + RLS por organization_id (ADR-002).
