# Sistema de pedidos — Pizzaria

Site de pedidos para uma pizzaria em Santa Rosa/RS. O cliente monta o pedido,
finaliza o checkout e é encaminhado ao WhatsApp com o resumo pronto. O dono
recebe os pedidos num painel e atualiza o status.

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
- `pedidos.bairro` é texto livre. `pedidos.bairro_id` existe mas está sem uso.
- `pedidos.codigo` é gerado no servidor (`PED-` + `id` com padding) depois do
  insert, em `src/app/api/pedidos/route.ts` — não existe default/trigger no
  banco pra isso.
- `config_loja.taxa_entrega_padrao` está **obsoleta/sem uso**, igual `bairro_id`
  — a coluna continua no banco mas o código não lê mais ela. A taxa de entrega
  real usa `config_loja.endereco_loja` + `taxa_entrega_por_km` (ver seção
  "Taxa de entrega por distância").

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
- A `service_role` key nunca pode chegar ao browser nem a variável
  `NEXT_PUBLIC_*`.

## Regras de negócio

- Dois tamanhos: **Broto** (4 fatias) e **Casal** (8 fatias). Confirmado com o
  dono: **não existe pizza meio a meio** — todo tamanho é 1 sabor só
  (`tamanhos.max_sabores = 1` nos dois). `config_loja.regra_meio_a_meio` ficou
  sem uso; a coluna continua no banco mas nada lê ela.
- Borda soma `preco_extra` por pizza. Existe opção "Tradicional" a R$0 além das
  pagas.
- Taxa de entrega é **calculada pela distância** até o endereço do cliente —
  ver "Taxa de entrega por distância" abaixo. Não existe mais taxa fixa nem
  seleção de bairro numa lista; o cliente ainda digita rua/número/bairro em
  texto livre, só que agora esse endereço alimenta o cálculo de frete.
- Pedido mínimo em `config_loja.pedido_minimo`. Retirada no balcão tem taxa zero
  (regra documentada; o checkout atual ainda não tem a opção de retirada no
  formulário — só fluxo de entrega).
- Loja fechada (`config_loja.aberta = false`) bloqueia a finalização do pedido.

## Taxa de entrega por distância

Implementado em 2026-09-14. Fluxo: no checkout, depois de preencher rua/número/
bairro, o cliente clica em "Calcular frete" → `POST /api/frete`
(`src/app/api/frete/route.ts`, roda no servidor) → chama a **Google Distance
Matrix API** com origem `config_loja.endereco_loja` e destino montado a partir
do endereço digitado → `taxa = distância_km × config_loja.taxa_entrega_por_km`
(sem taxa base, só R$/km).

- Precisa da env var **`GOOGLE_MAPS_API_KEY`** (server-only, sem `NEXT_PUBLIC_`)
  com a Distance Matrix API habilitada e faturamento ativo no Google Cloud.
  Ainda não configurada — sem ela a rota retorna erro 500 e o checkout mostra
  "Fale com a loja pelo WhatsApp".
- A taxa fica em `CartContext` como `taxaEntrega: number | null` — `null`
  significa "ainda não calculada". O botão de enviar pedido fica desabilitado
  até calcular. Qualquer edição em rua/número/bairro invalida o cálculo
  anterior (`limparTaxaEntrega`), forçando recalcular.
- `config_loja.taxa_entrega_por_km` está com valor **fictício (R$1,50/km)** —
  pendência 1 abaixo.
- Não existe cálculo automático de raio máximo de entrega; se quiser bloquear
  endereços fora do perímetro, precisa ser adicionado.

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
- Contas de login existem (2, criadas em 2026-09-16) — ver Pendências.

## Impressão de cupom

Implementado em 2026-10-05. Impressora térmica **Oásis OIA-8388** (80mm),
ligada no PC Windows do amigo, que fica com o `/painel` sempre aberto.

- `src/lib/cupom-pedido.ts` monta o cupom em HTML (largura útil 72mm) e
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

MVP usa link `wa.me` — o site monta o texto e redireciona; o cliente aperta
enviar. Número em `config_loja.telefone_whats`. A mensagem inclui o `codigo`
do pedido, já gravado no banco antes de montar o link (`POST /api/pedidos`
roda primeiro, em `src/app/checkout/page.tsx`).

A URL tem limite prático de tamanho: mandar só o resumo e o link de
acompanhamento, nunca o pedido detalhado inteiro.

A WhatsApp Cloud API (mensagens automáticas de status) fica para depois, quando
o volume justificar. Exige conta Meta verificada, número dedicado e templates
aprovados.

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
gravado no banco. **`config_loja.pedido_minimo` (R$ 30,00) e
`taxa_entrega_por_km` (R$ 1,50/km) ainda são valor fictício do seed** — não
tratar como referência até resolver a pendência 1 abaixo.

## Pendências com o dono da pizzaria

1. Valor real do R$/km de entrega e do pedido mínimo
2. Criar a chave `GOOGLE_MAPS_API_KEY` (Google Cloud, Distance Matrix API +
   faturamento) e configurar em produção — sem ela o checkout não calcula frete
3. Configurar `SUPABASE_SERVICE_ROLE_KEY` em `.env.local` e na Vercel
   (produção) — pegar em Supabase Dashboard → Project Settings → API →
   service_role secret. Não é recuperável via ferramentas automatizadas, só
   colando manualmente. Sem ela, `POST /api/pedidos` (gravação do pedido)
   falha.
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
