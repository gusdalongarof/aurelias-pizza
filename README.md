# Aurelia's Pizza

Sistema de pedidos para uma pizzaria em Santa Rosa/RS. O cliente monta o
pedido, finaliza o checkout e é encaminhado ao WhatsApp com o resumo pronto.
O dono recebe os pedidos num painel e atualiza o status.

## Stack

- Next.js 16 (App Router, TypeScript, `src/`)
- Tailwind CSS 4
- Supabase (PostgreSQL + RLS)

## Rodando localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Variáveis de ambiente

Crie um `.env.local` na raiz com:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

A `service_role` key do Supabase (usada só no servidor, para gravar pedidos)
nunca deve entrar em variável `NEXT_PUBLIC_*` nem ser commitada.

## Status do projeto

Veja `CLAUDE.md` para as convenções de código, estrutura do banco de dados,
regras de negócio e o roadmap de fases em andamento.

**Atenção:** os dados de cardápio no banco atual são fictícios (seed de
desenvolvimento) — o cardápio real da pizzaria ainda não foi cadastrado.
