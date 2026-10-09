# Sistema de pedidos — Pizzaria

Site de pedidos para uma pizzaria em Santa Rosa/RS. O cliente monta o pedido,
finaliza o checkout e recebe um código para acompanhar o pedido. O dono
recebe os pedidos num painel (com alerta sonoro e cupom impresso) e atualiza
o status.

## Stack

- Next.js 16 (App Router, TypeScript, `src/`)
- Tailwind CSS 4 — o `globals.css` tem só `@import "tailwindcss";`
- Supabase (PostgreSQL + RLS), projeto `cfpncdiijbkieumknnke`
- Deploy previsto: Vercel

## Convenções

- Server Components buscam dados do Supabase; Client Components só cuidam de
  estado e interação. Não usar `useEffect` para buscar dados que o servidor
  pode entregar por props.
- Formatação de moeda e data/hora vive em `src/lib/format.ts` (`brl`,
  `formatDataHora`). Não redeclarar `Intl.NumberFormat`/`Intl.DateTimeFormat`
  em componente.
- Quatro clientes Supabase, cada um com seu uso:
  - `src/lib/supabase.ts` — chave publishable (anon), leitura pública de
    catálogo/config.
  - `src/lib/supabase-admin.ts` — `service_role`, server-only, ignora RLS.
    Usado por `POST /api/pedidos` (gravação do pedido feita pelo checkout,
    fluxo sem login) e pelo rastreio público de pedido (`/pedido/[codigo]` e
    `GET /api/pedidos/rastrear/[codigo]`), já que `anon` não tem policy de
    SELECT em `pedidos` — ver seção "Rastreio público de pedido".
  - `src/lib/supabase-server.ts` / `src/lib/supabase-browser.ts` — sessão do
    usuário logado (via `@supabase/ssr`), usados pelo painel do dono
    (`/painel`). Respeitam RLS pela sessão, não têm privilégio de
    service_role.
- Nada de cardápio fixo no código. Tamanhos, sabores, preços, bordas e bebidas
  vêm sempre do banco.

## Banco de dados

Catálogo: `tamanhos`, `sabores`, `sabor_preco` (preço por sabor × tamanho),
`bordas`, `bebidas`, `bairros`, `config_loja`.
Pedidos: `pedidos`, `pedido_itens`, `pedido_item_sabores`, `pedido_status_hist`.

Detalhes que já causaram erro:

- **Só `tamanhos` tem coluna `ordem`.** `sabores` e `bordas` não têm — ordenar
  por `nome` e `preco_extra` respectivamente.
- `config_loja` tem uma linha só, `id = 1`, garantida por CHECK. Filtrar com
  `.eq('id', 1).single()`.
- `pedido_itens.preco_unit` guarda o preço no momento do pedido. Nunca recalcular
  o total de um pedido antigo a partir do cardápio atual.
- `pedidos.bairro` guarda o nome do bairro (ou `Interior — <localidade>`) e
  `pedidos.bairro_id` o id em `bairros` (null = interior).
- `pedidos.codigo` é gerado no servidor (`PED-` + `id` com padding) depois do
  insert, em `src/app/api/pedidos/route.ts` — não existe default/trigger no
  banco pra isso.
- `config_loja.taxa_entrega_padrao`, `taxa_entrega_por_km`, `endereco_loja`
  e `aviso_entrega` estão **obsoletas/sem uso** (`aviso_entrega` — "Entregamos
  no perímetro urbano." — saiu do Header em 2026-10-07, já que há entrega no
  interior) — as colunas continuam no banco mas o código não
  lê mais. A taxa de entrega é por bairro (ver "Taxa de entrega por bairro").

## RLS

Está ativo em todas as tabelas.

- Catálogo: SELECT público apenas onde `ativo = true`.
- Tabelas de pedido (`pedidos`, `pedido_itens`, `pedido_item_sabores`,
  `pedido_status_hist`): desde 2026-09-16, policies para o role
  `authenticated` (dono + amigo logados no painel) — SELECT nas 4 tabelas,
  UPDATE em `pedidos`, INSERT em `pedido_status_hist`. **Nenhuma policy para
  `anon`.** INSERT em `pedidos`/`pedido_itens`/`pedido_item_sabores` continua
  só via `service_role` (feito pelo checkout em `POST /api/pedidos`), não tem
  policy pra `authenticated` nem `anon`.
- `config_loja`: além do SELECT público, `authenticated` pode dar UPDATE
  **só na coluna `aberta`** (grant por coluna + policy
  `painel_atualiza_aberta`, migration `painel_abrir_fechar_loja`, 2026-10-05).
  `anon` não tem UPDATE. Demais colunas só via dashboard/service_role.
  Desde 2026-10-06 (migration `painel_promocoes_frete_gratis`) o grant por
  coluna inclui também `frete_gratis`, `desconto_pedido_ativo` e
  `desconto_pedido_pct`.
- `sabor_preco`: `authenticated` pode dar UPDATE **só em `preco_promo` e
  `preco`** (grant por coluna + policy `painel_atualiza_preco_promo`) e
  INSERT (policy `painel_cria_sabor_preco`). `preco` ganhou UPDATE em
  2026-10-09 (migration `painel_edita_sabores`), ver "Cardápio no painel".
- `sabores`: desde 2026-10-09 `authenticated` lê todos (inclusive
  `ativo = false`, policy `painel_le_sabores`), insere, e dá UPDATE só em
  `nome`, `descricao`, `categoria`, `ativo`. Sem DELETE (pedidos antigos
  referenciam o sabor). CHECKs: `categoria in ('salgada','doce')` e
  `sabor_preco.preco > 0`. O site público lê pela chave anon, então
  continua vendo só os ativos.
- A `service_role` key nunca pode chegar ao browser nem a variável
  `NEXT_PUBLIC_*`.
- `public.rls_auto_enable()` é a função do event trigger `ensure_rls` (liga
  RLS em toda tabela nova do `public`). EXECUTE revogado de `public`/`anon`/
  `authenticated` em 2026-10-07 (migration `revoga_execute_rls_auto_enable`)
  por alerta do Security Advisor — o trigger continua funcionando.
- Pendente no dashboard (Authentication → Settings): ligar "Leaked password
  protection" (alerta do Security Advisor).

## Regras de negócio

- Dois tamanhos: **Broto** (4 fatias) e **Casal** (8 fatias). Confirmado com o
  dono: **não existe pizza meio a meio** — todo tamanho é 1 sabor só
  (`tamanhos.max_sabores = 1` nos dois). `config_loja.regra_meio_a_meio` ficou
  sem uso; a coluna continua no banco mas nada lê ela.
- Borda soma `preco_extra` por pizza. Existe opção "Tradicional" a R$0 além das
  pagas.
- Taxa de entrega é **por bairro**, escolhido numa lista no checkout — ver
  "Taxa de entrega por bairro" abaixo.
- Pedido mínimo em `config_loja.pedido_minimo`. Retirada no balcão tem taxa zero
  (regra documentada; o checkout atual ainda não tem a opção de retirada no
  formulário — só fluxo de entrega).
- Loja fechada (`config_loja.aberta = false`) bloqueia a finalização do pedido.
  Desde 2026-10-07 o bloqueio também é no front, não só no servidor:
  - Home (`src/app/page.tsx`): abre direto com um modal "Estamos fechados no
    momento" (`src/components/LojaFechadaAviso.tsx`). O botão "Ver cardápio"
    fecha o modal e deixa só o cardápio de consulta — `MontadorPizza`,
    `SecaoBebidas`, `CarrinhoDrawer` e `CarrinhoBarraFlutuante` nem são
    renderizados; no lugar fica `LojaFechadaCartao`.
  - `/checkout` (`src/app/checkout/page.tsx`) lê `config_loja.aberta` e, se
    fechada, mostra o aviso em vez do `CheckoutForm`.
  - `CarrinhoDrawer` desativa "Finalizar Pedido" (carrinho antigo no
    sessionStorage).
  - `POST /api/pedidos` continua recusando — é a barreira de verdade.

## Taxa de entrega por bairro

Desde 2026-10-06 (substituiu o cálculo por distância com Google Maps, que foi
abandonado — não vai ter chave da API). Valores reais passados pelo Gustavo.

- Tabela `bairros` (`nome`, `taxa_entrega`, `tempo_entrega_min`, `ativo`).
  O checkout é uma Server Component (`src/app/checkout/page.tsx`) que busca os
  bairros ativos e passa para `src/components/CheckoutForm.tsx`.
- O Header da home diz "Taxa de entrega por bairro" (antes falava em
  distância).
- O select mostra só o nome do bairro, em ordem alfabética; a taxa aparece
  apenas no resumo do pedido (linha "Entrega"). `tempo_entrega_min` fica no
  banco mas não é exibido.
- Última opção: **"Interior (fora da cidade)"**, taxa única em
  `config_loja.taxa_entrega_interior` (R$ 18,00). Ao escolher, o cliente
  digita a localidade (linha/comunidade), gravada como
  `pedidos.bairro = 'Interior — <localidade>'` e `bairro_id = null`.
- `POST /api/pedidos` pega a taxa da tabela (ou do interior), não do
  navegador, e responde 409 se divergir do que o cliente viu.
- Para mudar valores ou adicionar bairro: editar `bairros` no banco (ainda
  não há tela no painel). Não precisa deploy — o checkout é `force-dynamic`.
  Novos bairros recebem `tempo_entrega_min` igual ao dos bairros de mesma
  taxa (só informativo, não é exibido).
- **"Central" e "Centro" são bairros diferentes** (confirmado com o Gustavo
  em 2026-10-07): Central (id 12) R$ 12,00, adicionado nessa data; Centro
  (id 1) R$ 10,00. Não unificar.

## Painel do dono (login + tempo real)

Implementado em 2026-09-16. Rota `/painel`, protegida por login individual
(Supabase Auth, e-mail/senha) — dono e o amigo que ajuda a gerenciar os
pedidos têm cada um sua conta.

- `src/proxy.ts` (convenção do Next 16 — sucessora de `middleware.ts`, que
  está deprecated; dentro de `src/`, não na raiz) com matcher `/painel/:path*`:
  renova a sessão e redireciona deslogado → `/painel/login`, logado tentando
  acessar `/painel/login` → `/painel`.
  `src/app/painel/page.tsx` faz uma checagem defensiva extra da sessão
  (`redirect` se não houver `user`), caso o middleware não rode por algum
  motivo.
- Lista de pedidos em tempo real: `src/components/painel/PedidosList.tsx`
  assina `postgres_changes` na tabela `pedidos` (Realtime habilitado só nessa
  tabela — ver seção RLS/migrations). Em INSERT, busca o pedido completo (com
  itens/sabores) e toca um beep; em UPDATE, só atualiza o status local.
- Alerta sonoro é **sintetizado via Web Audio API**
  (`src/lib/som-alerta.ts`), não é um arquivo de áudio. Por causa da política
  de autoplay do navegador, o primeiro beep só toca depois que o usuário
  clica em "Ativar alertas sonoros" na tela. Esse clique já toca o alerta
  uma vez (confere o volume e libera o áudio dentro do gesto).
  Desde 2026-10-07 o alerta é mais alto, a pedido do Gustavo: onda quadrada
  a 90% com `DynamicsCompressor`, duas notas alternadas (988/1319 Hz)
  repetidas 3x, ~2s no total. Antes eram dois bipes senoidais curtos a 35%.
  Ajustar em `TOQUES`/`DURACAO`/`VOLUME` no topo de `som-alerta.ts`. O volume
  do Windows e das caixas no PC do painel também limita.
- Transição de status é validada no servidor, não só documentada:
  `src/app/api/pedidos/[id]/status/route.ts` (ver seção "Status de status do
  pedido" abaixo).
- Abrir/fechar a loja: `LojaAbertaToggle.tsx` no topo do painel →
  `POST /api/loja/aberta` (`src/app/api/loja/aberta/route.ts`, client da
  sessão, não service_role). Fechar pede confirmação. Com a loja fechada,
  o Header mostra "Fechado no momento", o site bloqueia o pedido no front
  (ver "Regras de negócio") e `POST /api/pedidos` recusa o pedido.
- Contas de login: 2 — a do Gustavo (2026-09-16) e a do dono (recriada pelo
  Gustavo em 2026-10-07) — ver Pendências.
- **Esqueci minha senha** (2026-10-07): link em `/painel/login` →
  `/painel/esqueci-senha` (`EsqueciSenhaForm.tsx`,
  `resetPasswordForEmail` com `redirectTo` = `<origin>/auth/confirm?next=/painel/nova-senha`)
  → e-mail → `src/app/auth/confirm/route.ts` (fora do matcher do proxy)
  troca o link por sessão → `/painel/nova-senha` (`updateUser`, mínimo 8
  caracteres) → `/painel`. O proxy deixa `/painel/login` e
  `/painel/esqueci-senha` abertas; `/painel/nova-senha` exige a sessão de
  recuperação. `next` só aceita caminhos `/painel/...` (sem open redirect).
  - Com o template de e-mail padrão (PKCE, `?code=`) o link **só funciona no
    mesmo navegador** em que foi pedido. Para funcionar em qualquer
    aparelho, trocar o template "Reset Password" no dashboard para
    `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/painel/nova-senha`
    — a rota já aceita os dois formatos.
  - Exige no dashboard (Authentication → URL Configuration): **Site URL** =
    domínio de produção e `https://<domínio>/auth/confirm` +
    `http://localhost:3000/auth/confirm` em **Redirect URLs**.
  - O SMTP padrão do Supabase só entrega para e-mails de membros da equipe
    da organização e tem limite baixo por hora. Para o dono receber, ele
    precisa estar na equipe do projeto ou configurar SMTP próprio.
- **Cadastro de conta nova tem que ficar desligado** no Supabase
  (Authentication → Sign In / Providers → "Allow new users to sign up").
  O site não tem tela de cadastro, mas a API do Supabase aceita `signUp` com
  a chave anon, e qualquer conta confirmada vira `authenticated` — que pelo
  RLS lê todos os pedidos (com telefone e endereço dos clientes), muda
  status e abre/fecha a loja. Estava ligado até 2026-10-07, quando o Gustavo
  desligou — conferido em seguida: `disable_signup: true` em
  `/auth/v1/settings`. Nessa conferência `auth.users` tinha 2 contas: a do
  Gustavo (2026-09-16) e uma `san…@hotmail.com` criada em 2026-10-07 22:13
  UTC pelo próprio Gustavo no dashboard ("Add user"), substituindo a outra
  conta de 2026-09-16, que ele apagou. Conferir com
  `curl $NEXT_PUBLIC_SUPABASE_URL/auth/v1/settings -H "apikey: <anon>"`.
  Contas novas, se precisar: criar pelo dashboard (Authentication → Users →
  Add user), que funciona com o cadastro desligado.

## Promoções e frete grátis

Implementado em 2026-10-06. Tela `/painel/promocoes` (link no topo do
painel), feita para o amigo do dono gerenciar sem mexer no banco. Tudo é
ligar/desligar manual — não há agendamento por data/dia da semana.

- **Frete grátis geral**: `config_loja.frete_gratis`. Ligado, o checkout
  ainda pede o bairro, mas a taxa é 0 para qualquer um.
- **Desconto % no pedido**: `config_loja.desconto_pedido_ativo` +
  `desconto_pedido_pct`. Incide só sobre o subtotal dos itens, não sobre a
  entrega. O pedido mínimo é comparado com o subtotal **antes** do desconto.
- **Preço promocional por sabor × tamanho**: `sabor_preco.preco_promo`
  (null = sem promoção; CHECK exige `< preco`). Cardápio e montador mostram
  o normal riscado. `precoVigente()` em `src/lib/promocao.ts` decide o preço.
- `pedidos.desconto` grava o desconto aplicado no momento (como
  `preco_unit`). `total = subtotal - desconto + taxa_entrega`.
- `POST /api/pedidos` recalcula o desconto e o frete grátis pelo banco
  (`calcularDesconto` em `src/lib/promocao.ts`, mesma função do carrinho) e
  responde **409** se divergir do que o cliente viu (promoção mudou
  enquanto ele estava na página).
- O root layout (`src/app/layout.tsx`) carrega `config_loja` e passa pro
  `CartProvider`, com `force-dynamic` — antes disso, `/checkout` aberto
  direto ficava com a config padrão do código.
- **Preço dos itens validado no servidor** (desde 2026-10-07): antes o
  servidor gravava o `precoUnitario` que o navegador mandava — dava para
  adulterar o preço pelo DevTools. Agora `calcularPrecosItens()`
  (`src/lib/preco-pedido.ts`) recalcula cada item pelo cardápio atual (média
  dos sabores com `precoVigente()` + borda; bebida pelo `preco`), lendo pela
  chave anon — item desativado some pelo RLS e o pedido é recusado (422).
  Também valida quantidade (1–50), sabores repetidos e `max_sabores`.
  Se o preço divergir, responde **409 com `precos`** (um por item, mesma
  ordem) e o `CheckoutForm` chama `atualizarPrecos()` do `CartContext`, então
  o resumo já mostra o valor certo e o cliente só finaliza de novo (resolve
  também a promoção que acabou com a pizza no carrinho). `preco_unit`,
  `subtotal` e o pedido mínimo usam o valor do servidor.

## Cardápio no painel

Implementado em 2026-10-09, a pedido do amigo do dono. Tela
`/painel/cardapio` (link "Cardápio" no topo do painel,
`src/components/painel/EditorCardapio.tsx`): editar nome, ingredientes,
tipo (salgada/doce), preço por tamanho e "Aparece no cardápio"; criar sabor
novo. Tirar do cardápio = desmarcar (não apaga). Bordas e bebidas ainda só
pelo banco.

- `POST /api/sabores` e `PATCH /api/sabores/[id]`, client da sessão;
  validação em `src/lib/sabor-form.ts`. Sabor novo é inserido com
  `ativo = false` e só é ativado depois que os preços gravam.
- Baixar o preço para ≤ `preco_promo` viola o CHECK de `sabor_preco` — a
  API responde pedindo para remover a promoção antes.
- Carrinho aberto com preço antigo: `POST /api/pedidos` já devolve 409 com
  os preços novos; sabor desativado → 422.
- `/painel/promocoes` filtra `ativo = true` (pela sessão o painel enxerga os
  desativados).

## Impressão de cupom

Implementado em 2026-10-05. Impressora térmica **Oásis OIA-8388** (80mm),
ligada no PC Windows do amigo, que fica com o `/painel` sempre aberto.

- `src/lib/cupom-pedido.ts` monta o cupom em HTML (largura útil **45mm**,
  encostado à esquerda — com 72mm a térmica cortava o lado direito) e
  imprime por um iframe oculto com `window.print()`. Não é ESC/POS direto.
- Em `PedidosList.tsx`, o checkbox "Imprimir cupom automaticamente" é
  **por computador** (`localStorage`, chave `painel:impressao-auto`). Só o PC
  da térmica deve ligar. No INSERT via Realtime, imprime uma vez por id.
- Cada `PedidoCard` tem botão "Imprimir" para reimpressão manual.
- Para imprimir sem o diálogo do Chrome, o atalho do Chrome nesse PC precisa
  de `--kiosk-printing`, e a OIA-8388 precisa ser a impressora padrão do
  Windows (com o papel configurado para 80mm no driver).
- **Driver:** a Oásis não publica driver da OIA-8388. Funciona com o driver
  genérico **POS-80 11.3.0.0** (o mesmo publicado como "OASIS OIA-8371 80MM"
  em downloads.hubos.com.br). Testado em 2026-10-05: o cupom saiu certo.
  **Não usar "Generic / Text Only"** — com ele o Chrome não imprime o cupom.
- Se o painel estiver aberto em duas abas nesse PC com o checkbox ligado,
  imprime duas vezes. Deixar uma aba só.

## Rastreio público de pedido

Implementado em 2026-09-21. Rota `/pedido/[codigo]` (sem login) — o cliente
acompanha o status do próprio pedido pelo `codigo` (ex: `PED-00001`) recebido
na tela de confirmação do checkout. `/pedido` (sem código) é uma tela de
busca simples que redireciona para `/pedido/[codigo]`. Também linkado no
Header ("Acompanhar pedido") e na confirmação do checkout.

- Como `anon` não tem policy de SELECT em `pedidos` (ver seção RLS), tanto a
  Server Component (`src/app/pedido/[codigo]/page.tsx`) quanto a rota
  `GET /api/pedidos/rastrear/[codigo]/route.ts` (usada pelo polling) leem via
  `supabase-admin` (`service_role`), não pela sessão do usuário — não existe
  sessão nesse fluxo.
- **`codigo` é sequencial e previsível** (`PED-` + id com padding), não é um
  token secreto — qualquer um pode tentar adivinhar um código válido. Por
  isso a query de rastreio (`src/lib/pedido-select.ts`, `SELECT_RASTREIO`)
  deliberadamente **não** expõe `cliente_fone`, `endereco`, `bairro`,
  `observacao`, `forma_pagamento` nem `troco_para` — só `codigo`, `status`,
  `criado_em`, itens e `total`. Se algum dia precisar expor mais dados aqui,
  trocar `codigo` por um token não sequencial primeiro.
- Sem Realtime nesse fluxo (Realtime respeita RLS, e `anon` não tem policy).
  `src/components/RastreioPedido.tsx` faz **polling a cada 10s** em vez de
  assinar `postgres_changes`.
- Labels/cores de status (`STATUS_LABEL`, `STATUS_COR`) e a ordem da máquina
  de estados (`ORDEM_STATUS`) foram extraídos para `src/lib/status-pedido.ts`
  e são compartilhados entre o painel (`PedidoCard.tsx`), a validação de
  transição (`api/pedidos/[id]/status/route.ts`) e o rastreio público.

## WhatsApp

**Removido do checkout em 2026-10-07**, a pedido do Gustavo. Antes o checkout
abria um link `wa.me` com o resumo do pedido; agora ele só grava
(`POST /api/pedidos`) e mostra a confirmação com o `codigo` e o link
"Acompanhar pedido". O pedido chega à loja pelo painel (Realtime + beep +
impressão), não por mensagem.

Desde 2026-10-07 a confirmação destaca o `codigo` num quadro dourado
("Anote o número do seu pedido"), explica que se acompanha por "Acompanhar
pedido" no topo do site e tem botões "Copiar número" / "Copiar link"
(`<origin>/pedido/<codigo>`). Sem WhatsApp nem e-mail, essa tela é o único
lugar onde o cliente recebe o código.

**Pix é pago na entrega**, como cartão e dinheiro (decidido em 2026-10-08,
a pedido do Gustavo). No checkout a opção diz "Pague na entrega" e a
confirmação mostra "Pix na entrega". Um botão "Pagar com Pix pelo WhatsApp"
na confirmação chegou a ser feito em 2026-10-07, mas foi descartado antes de
ser commitado. Não existe chave Pix no banco.

- `config_loja.telefone_whats`: desde 2026-10-08 o Header da home mostra o
  número formatado (`formatTelefone` em `src/lib/format.ts`) e um botão
  "Chamar no WhatsApp" (`wa.me/<número>`, sem mensagem pronta). A tela de
  confirmação do checkout tem o mesmo botão (abaixo do resumo), que abre a
  conversa com "Olá! Meu pedido é o PED-…" já digitado — só um atalho de
  contato, o pedido continua chegando pelo painel. Ícone em
  `src/components/IconeWhatsApp.tsx`. Se o campo estiver vazio, os dois
  blocos somem. Número real da pizzaria, passado pelo Gustavo
  em 2026-10-07: `5555991473414` ((55) 99147-3414) — o valor anterior
  (`5555992323508`) era do seed. Para trocar, editar no banco (sem deploy).
- Mensagens de erro ainda dizem "fale com a loja pelo WhatsApp" como contato
  alternativo — é só texto, não há link.
- A WhatsApp Cloud API (mensagens automáticas de status) segue como ideia
  futura. Exige conta Meta verificada, número dedicado e templates aprovados.

## Status de status do pedido

```
novo -> aceito -> em_preparo -> saiu_entrega -> entregue
  \-> recusado (final, exige motivo)
```

Só avança para frente. Correção é reversão manual registrada em
`pedido_status_hist`.

Aplicado em `src/app/api/pedidos/[id]/status/route.ts`: rejeita qualquer
transição que não seja exatamente a próxima da sequência (ou `recusado` a
partir de um estado não-final, com `motivo` obrigatório). Usa o client
autenticado do próprio usuário logado (não o `service_role`), então o RLS
também gatekeepa por sessão.

## Atenção

**Cardápio (sabores, bordas e preços) já é o real**, recebido do dono e
gravado no banco, assim como as taxas por bairro (2026-10-06) e o pedido
mínimo (`config_loja.pedido_minimo` = R$ 20,00, passado pelo Gustavo em
2026-10-08; o fallback do `CartContext` usa o mesmo valor).

## Pendências com o dono da pizzaria

1. ~~Valor real do pedido mínimo~~ — **resolvido** em 2026-10-08: R$ 20,00
2. ~~Chave `GOOGLE_MAPS_API_KEY`~~ — **descartado** em 2026-10-06; entrega
   passou a ser por bairro
3. ~~`SUPABASE_SERVICE_ROLE_KEY` na Vercel~~ — **resolvido**: conferido em
   2026-10-07 pelos logs do Supabase que `POST /api/pedidos` em produção
   (Vercel, iad1) grava com a chave secreta.
4. ~~Contas de login do painel~~ — **resolvido**: `auth.users` tem 2 contas
   confirmadas (conferido em 2026-10-05). O dono é amigo do Gustavo, então
   não há uma terceira conta separada. Em 2026-10-07 o Gustavo apagou a conta
   antiga do dono (nunca tinha feito login) e criou outra pelo dashboard.
   Primeiro login da conta nova confirmado no mesmo dia (22:39 UTC).
5. Projeto Supabase no plano gratuito **pausa após ~7 dias sem uso** — já
   pausou uma vez (restaurado em 2026-10-05 sem perda de dados). Antes de ir
   para produção, garantir uso regular ou plano pago.

## Fases

1. Cardápio lendo do banco — **feito**
2. Montagem da pizza (tamanho, sabores, borda, preço) — **feito**
3. Carrinho — **feito**
4. Checkout e gravação do pedido — **feito**
5. Painel do dono: login, lista em tempo real, alerta sonoro, fluxo de status
   — **feito** (falta só criar as contas de login — pendência 4 acima)
6. CRUD de cardápio — sabores e preços **feito** (2026-10-09, ver
   "Cardápio no painel"); bordas, bebidas e horário de funcionamento —
   pendente. Página pública de
   acompanhamento (`/pedido/[codigo]`) — **feito**, ver seção "Rastreio
   público de pedido" acima.
