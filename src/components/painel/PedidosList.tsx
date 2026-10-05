'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { tocarBeep } from '@/lib/som-alerta'
import { imprimirCupom } from '@/lib/cupom-pedido'
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

const CHAVE_IMPRESSAO_AUTO = 'painel:impressao-auto'
const ouvintesImpressao = new Set<() => void>()

function lerImpressaoAuto() {
  try {
    return localStorage.getItem(CHAVE_IMPRESSAO_AUTO) === '1'
  } catch {
    return false
  }
}

function gravarImpressaoAuto(ativo: boolean) {
  try {
    localStorage.setItem(CHAVE_IMPRESSAO_AUTO, ativo ? '1' : '0')
  } catch {}
  ouvintesImpressao.forEach((ouvir) => ouvir())
}

function assinarImpressaoAuto(ouvir: () => void) {
  ouvintesImpressao.add(ouvir)
  return () => {
    ouvintesImpressao.delete(ouvir)
  }
}

export default function PedidosList({ pedidosIniciais }: { pedidosIniciais: Pedido[] }) {
  const [pedidos, setPedidos] = useState(pedidosIniciais)
  const [somAtivo, setSomAtivo] = useState(false)
  const somAtivoRef = useRef(somAtivo)
  // Impressão automática é por máquina: só o PC com a térmica liga.
  const impressaoAuto = useSyncExternalStore(assinarImpressaoAuto, lerImpressaoAuto, () => false)
  const impressaoAutoRef = useRef(impressaoAuto)
  const impressosRef = useRef(new Set<number>())

  useEffect(() => {
    somAtivoRef.current = somAtivo
  }, [somAtivo])

  useEffect(() => {
    impressaoAutoRef.current = impressaoAuto
  }, [impressaoAuto])

  const alternarImpressaoAuto = () => gravarImpressaoAuto(!impressaoAuto)

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
            const pedido = data as unknown as Pedido
            setPedidos((prev) => [pedido, ...prev])
            if (impressaoAutoRef.current && !impressosRef.current.has(pedido.id)) {
              impressosRef.current.add(pedido.id)
              imprimirCupom(pedido)
            }
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
      <div className="space-y-3">
        {!somAtivo && (
          <button type="button" onClick={() => setSomAtivo(true)} className="btn-primary">
            🔔 Ativar alertas sonoros
          </button>
        )}
        <label className="flex items-center gap-2 text-sm text-[#8AA087] cursor-pointer">
          <input type="checkbox" checked={impressaoAuto} onChange={alternarImpressaoAuto} />
          🖨️ Imprimir cupom automaticamente quando chegar pedido (só neste computador)
        </label>
      </div>

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
