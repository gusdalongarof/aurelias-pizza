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
- `sabor_preco`: `authenticated` pode dar UPDATE **só em `preco_promo`**
  (grant por coluna + policy `painel_atualiza_preco_promo`). O preço normal
  continua só via dashboard/service_role.
- A `service_role` key nunca pode chegar ao browser nem a variável
  `NEXT_PUBLIC_*`.

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
  não há tela no painel).

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
  clica em "Ativar alertas sonoros" na tela.
- Transição de status é validada no servidor, não só documentada:
  `src/app/api/pedidos/[id]/status/route.ts` (ver seção "Status de status do
  pedido" abaixo).
- Abrir/fechar a loja: `LojaAbertaToggle.tsx` no topo do painel →
  `POST /api/loja/aberta` (`src/app/api/loja/aberta/route.ts`, client da
  sessão, não service_role). Fechar pede confirmação. Com a loja fechada,
  o Header mostra "Fechado no momento", o site bloqueia o pedido no front
  (ver "Regras de negócio") e `POST /api/pedidos` recusa o pedido.
- Contas de login existem (2, criadas em 2026-09-16) — ver Pendências.

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
- **Limitação conhecida**: o servidor ainda confia no `precoUnitario` que o
  navegador manda por item (já era assim antes das promoções). Um preço
  promocional que acabou enquanto a pizza estava no carrinho
  (sessionStorage) é cobrado pelo valor antigo.

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

- `config_loja.telefone_whats` ficou sem uso no checkout.
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
gravado no banco, assim como as taxas por bairro (2026-10-06).
**`config_loja.pedido_minimo` (R$ 30,00) ainda é valor fictício do seed** —
não tratar como referência até resolver a pendência 1 abaixo.

## Pendências com o dono da pizzaria

1. Valor real do pedido mínimo
2. ~~Chave `GOOGLE_MAPS_API_KEY`~~ — **descartado** em 2026-10-06; entrega
   passou a ser por bairro
3. ~~`SUPABASE_SERVICE_ROLE_KEY` na Vercel~~ — **resolvido**: conferido em
   2026-10-07 pelos logs do Supabase que `POST /api/pedidos` em produção
   (Vercel, iad1) grava com a chave secreta.
4. ~~Contas de login do painel~~ — **resolvido**: `auth.users` tem 2 contas
   confirmadas (conferido em 2026-10-05). O dono é amigo do Gustavo, então
   não há uma terceira conta separada. A conta do dono ainda não tinha feito
   nenhum login até essa data.
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
6. CRUD de cardápio, horário de funcionamento — pendente. Página pública de
   acompanhamento (`/pedido/[codigo]`) — **feito**, ver seção "Rastreio
   público de pedido" acima.
