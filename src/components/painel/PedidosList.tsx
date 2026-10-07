'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { tocarBeep } from '@/lib/som-alerta'
import { imprimirCupom } from '@/lib/cupom-pedido'
import PedidoCard from './PedidoCard'
import type { Pedido, PedidoStatus } from '@/types/pedido'

const SELECT_PEDIDO = `
  id, codigo, cliente_nome, cliente_fone, tipo_entrega, endereco, bairro,
  forma_pagamento, troco_para, observacao, subtotal, desconto, taxa_entrega, total,
  status, criado_em,
  pedido_itens (
    id, tipo, tamanho_id, borda_id, bebida_id, quantidade, preco_unit, observacao,
    tamanhos ( nome ), bordas ( nome ), bebidas ( nome, volume ),
    pedido_item_sabores ( sabor_id, sabores ( nome ) )
  )
`

// POST /api/pedidos grava em vários passos (pedido com código TMP → código
// PED- → itens → sabores → histórico), e o Realtime avisa já no primeiro.
// O registro em pedido_status_hist é o último passo: só com ele o pedido
// está completo para mostrar e imprimir. Retorna null se o pedido sumir
// (a rota apaga em caso de falha) ou não completar a tempo.
async function buscarPedidoCompleto(id: number): Promise<Pedido | null> {
  for (let tentativa = 0; tentativa < 20; tentativa++) {
    const { data, error } = await supabaseBrowser
      .from('pedidos')
      .select(`${SELECT_PEDIDO}, pedido_status_hist ( id )`)
      .eq('id', id)
      .maybeSingle()

    if (!error && !data) return null
    if (data && data.pedido_status_hist.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { pedido_status_hist, ...pedido } = data
      return pedido as unknown as Pedido
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  return null
}

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
          const pedido = await buscarPedidoCompleto(payload.new.id)
          if (pedido) {
            setPedidos((prev) => [pedido, ...prev])
            if (impressaoAutoRef.current && !impressosRef.current.has(pedido.id)) {
              impressosRef.current.add(pedido.id)
              imprimirCupom(pedido)
            }
            if (somAtivoRef.current) tocarBeep()
          }
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
          <button type="button" onClick={() => {
              setSomAtivo(true)
              tocarBeep() // toca uma vez para conferir o volume e já liberar o áudio no gesto
            }} className="btn-primary">
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
