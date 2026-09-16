import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import LogoutButton from '@/components/painel/LogoutButton'
import PedidosList from '@/components/painel/PedidosList'
import type { Pedido } from '@/types/pedido'

export const dynamic = 'force-dynamic'

export default async function PainelPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/painel/login')
  }

  const { data: pedidos, error } = await supabase
    .from('pedidos')
    .select(
      `
      id, codigo, cliente_nome, cliente_fone, tipo_entrega, endereco, bairro,
      forma_pagamento, troco_para, observacao, subtotal, taxa_entrega, total,
      status, criado_em,
      pedido_itens (
        id, tipo, tamanho_id, borda_id, bebida_id, quantidade, preco_unit, observacao,
        tamanhos ( nome ), bordas ( nome ), bebidas ( nome, volume ),
        pedido_item_sabores ( sabor_id, sabores ( nome ) )
      )
    `
    )
    .order('criado_em', { ascending: false })
    .limit(100)

  return (
    <main className="px-4 sm:px-6 py-8 pb-20">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between border-b border-[#1A2318] pb-4 mb-8">
          <h1
            className="text-xl font-bold text-[#D0D8D0]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Painel do dono
          </h1>
          <div className="flex items-center gap-3 text-xs text-[#526550]">
            <span>{user.email}</span>
            <LogoutButton />
          </div>
        </div>

        {error ? (
          <p className="text-sm text-[#C47070]">Não foi possível carregar os pedidos.</p>
        ) : (
          <PedidosList pedidosIniciais={(pedidos ?? []) as unknown as Pedido[]} />
        )}
      </div>
    </main>
  )
}
