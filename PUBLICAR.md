# Como publicar o Radar Fundiário no GitHub Pages

Tempo estimado: 10 minutos. Faz uma vez só — depois, atualizar é 1 comando.

---

## Passo 1 — Criar a conta (se ainda não tem)

1. Acesse https://github.com e clique em **Sign up**.
2. Use um e-mail seu, crie usuário e senha.

## Passo 2 — Criar o repositório

1. Logado no GitHub, clique no **+** (canto superior direito) → **New repository**.
2. Preencha:
   - **Repository name:** `radar-fundiario` (ou o nome que preferir, sem espaços/acentos)
   - **Public** (obrigatório para o Pages no plano gratuito)
   - **NÃO** marque "Add a README" (o projeto já tem um)
3. Clique em **Create repository**.
4. Na tela seguinte, copie a URL que aparece — algo como:
   `https://github.com/SEU-USUARIO/radar-fundiario.git`

## Passo 3 — Enviar os arquivos (uma vez só)

Abra o **PowerShell** dentro da pasta do projeto (no Explorador de Arquivos,
abra a pasta `Projeto Radar Fundiário`, clique na barra de endereço, digite
`powershell` e Enter). Então rode, trocando a URL pela sua:

```
git remote add origin https://github.com/SEU-USUARIO/radar-fundiario.git
git push -u origin master
```

Na primeira vez, o Windows abre uma janela do navegador pedindo para
autorizar o GitHub — clique em **Authorize** e pronto (ele memoriza).

## Passo 4 — Ligar o GitHub Pages

1. No site do GitHub, dentro do repositório, vá em **Settings** → **Pages**
   (menu da esquerda).
2. Em **Build and deployment**:
   - **Source:** Deploy from a branch
   - **Branch:** `master` · pasta `/ (root)` → **Save**
3. Aguarde ~1 minuto e recarregue a página: o endereço aparece no topo:

   **https://SEU-USUARIO.github.io/radar-fundiario/**

Abrindo esse endereço, o `index.html` redireciona para o app. Em HTTPS o
service worker ativa sozinho (funciona offline depois da 1ª visita) e dá
para **instalar no celular**: no Chrome/Android, menu ⋮ → "Adicionar à tela
inicial"; no iPhone/Safari, botão compartilhar → "Adicionar à Tela de Início".

---

## Como atualizar depois (sempre que mudar algo)

No PowerShell, dentro da pasta:

```
git add -A
git commit -m "descreva o que mudou"
git push
```

Em ~1 minuto o site atualiza sozinho.

## Atualizar os imóveis da Caixa

A lista da Caixa muda todo dia. Quando quiser dados frescos:

```
python atualizar-caixa.py
git add -A
git commit -m "atualiza imoveis da Caixa"
git push
```

---

## Avisos

- Repositório público = qualquer pessoa com o link acessa o app e o código.
  Não há segredo nenhum nos arquivos (só dados públicos), mas evite divulgar
  a URL se quiser manter o "uso próprio".
- O app continua funcionando localmente: basta abrir o `radar-goiania.html`
  com dois cliques — publicar não muda nada disso.
