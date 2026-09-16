'use client'

import { useEffect, useRef, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { tocarBeep } from '@/lib/som-alerta'
import PedidoCard from './PedidoCard'
import type { Pedido, PedidoStatus } from '@/types/pedido'

const SELECT_PEDIDO = `
  id, codigo, cliente_nome, cliente_fone, tipo_entrega, endereco, bairro,
  forma_pagamento, troco_para, observacao, subtotal, taxa_entrega, total,
  status, criado_em,
  pedido_itens (
    id, tipo, tamanho_id, borda_id, bebida_id, quantidade, preco_unit, observacao,
    tamanhos ( nome ), bordas ( nome ), bebidas ( nome, volume ),
    pedido_item_sabores ( sabor_id, sabores ( nome ) )
  )
`

export default function PedidosList({ pedidosIniciais }: { pedidosIniciais: Pedido[] }) {
  const [pedidos, setPedidos] = useState(pedidosIniciais)
  const [somAtivo, setSomAtivo] = useState(false)
  const somAtivoRef = useRef(somAtivo)

  useEffect(() => {
    somAtivoRef.current = somAtivo
  }, [somAtivo])

  useEffect(() => {
    const canal = supabaseBrowser
      .channel('painel-pedidos')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pedidos' },
        async (payload) => {
          const { data } = await supabaseBrowser
            .from('pedidos')
            .select(SELECT_PEDIDO)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setPedidos((prev) => [data as unknown as Pedido, ...prev])
          }
          if (somAtivoRef.current) tocarBeep()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedidos' },
        (payload) => {
          setPedidos((prev) =>
            prev.map((p) =>
              p.id === payload.new.id ? { ...p, status: payload.new.status as PedidoStatus } : p
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabaseBrowser.removeChannel(canal)
    }
  }, [])

  const handleAtualizado = (id: number, status: PedidoStatus) => {
    setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)))
  }

  const abertos = pedidos.filter((p) => p.status !== 'entregue' && p.status !== 'recusado')
  const finalizados = pedidos.filter((p) => p.status === 'entregue' || p.status === 'recusado')

  return (
    <div className="space-y-8">
      {!somAtivo && (
        <button type="button" onClick={() => setSomAtivo(true)} className="btn-primary">
          🔔 Ativar alertas sonoros
        </button>
      )}

      <section>
        <h2 className="text-xs font-semibold text-[#526550] uppercase tracking-widest mb-3">
          Em aberto ({abertos.length})
        </h2>
        {abertos.length === 0 ? (
          <p className="text-sm text-[#3D5040]">Nenhum pedido em aberto.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {abertos.map((p) => (
              <PedidoCard key={p.id} pedido={p} onAtualizado={handleAtualizado} />
            ))}
          </div>
        )}
      </section>

      {finalizados.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-[#526550] uppercase tracking-widest mb-3">
            Finalizados
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 opacity-60">
            {finalizados.map((p) => (
              <PedidoCard key={p.id} pedido={p} onAtualizado={handleAtualizado} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
