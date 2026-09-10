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
- Formatação de moeda vive em `src/lib/format.ts` (`brl`). Não redeclarar
  `Intl.NumberFormat` em componente. Hoje existem cópias duplicadas em
  `checkout/page.tsx` e outros — consolidar quando tocar nesses arquivos.
- Cliente do Supabase em `src/lib/supabase.ts`, usando a chave publishable.
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

## RLS

Está ativo em todas as tabelas.

- Catálogo: SELECT público apenas onde `ativo = true`.
- Tabelas de pedido: **nenhuma policy**. Só devem ser gravadas pelo servidor
  usando a `service_role` key, que ignora RLS.
- A `service_role` key nunca pode chegar ao browser nem a variável
  `NEXT_PUBLIC_*`.

## Regras de negócio

- Dois tamanhos: **Broto** (4 fatias, 1 sabor) e **Casal** (8 fatias, 2 sabores).
- Pizza de dois sabores é cobrada pela **média** dos dois preços. A regra está em
  `config_loja.regra_meio_a_meio` (`media` ou `maior`) — ler do banco, não fixar
  no código.
- Borda soma `preco_extra` por pizza.
- Taxa de entrega é **fixa**, em `config_loja.taxa_entrega_padrao`. Não existe
  seleção de bairro nem taxa por região. O cliente digita o bairro em texto livre.
- Pedido mínimo em `config_loja.pedido_minimo`. Retirada no balcão tem taxa zero.
- Loja fechada (`config_loja.aberta = false`) bloqueia a finalização do pedido.

## WhatsApp

MVP usa link `wa.me` — o site monta o texto e redireciona; o cliente aperta
enviar. Número em `config_loja.telefone_whats`.

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

## Atenção

**Os dados do cardápio no banco são fictícios.** Sabores, descrições, preços,
taxa de entrega (R$ 8,00) e pedido mínimo (R$ 30,00) foram inventados como seed.
O cardápio real ainda não chegou. Não tratar esses valores como referência de
nada.

## Pendências com o dono da pizzaria

1. Cardápio real: sabores, descrições e preços por tamanho
2. Valor real da taxa de entrega e do pedido mínimo
3. Confirmar que a Broto é mesmo de um sabor só
4. Pizza doce pode ser combinada com salgada numa meio a meio?
   (a coluna `sabores.categoria` é onde essa regra deve viver, se existir)
5. Arredondar a média quando cair em centavo quebrado?

## Fases

1. Cardápio lendo do banco — **feito**
2. Montagem da pizza (tamanho, sabores, borda, preço) — **feito**
3. Carrinho — **feito**
4. Checkout e gravação do pedido — em andamento
5. Painel do dono: login, lista em tempo real, alerta sonoro, fluxo de status
6. CRUD de cardápio, horário de funcionamento, página pública de acompanhamento
