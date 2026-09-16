'use client'

import { useState } from 'react'
import { brl, formatDataHora } from '@/lib/format'
import type { Pedido, PedidoStatus } from '@/types/pedido'

const PROXIMO_STATUS: Partial<Record<PedidoStatus, { status: PedidoStatus; label: string }>> = {
  novo: { status: 'aceito', label: 'Aceitar pedido' },
  aceito: { status: 'em_preparo', label: 'Iniciar preparo' },
  em_preparo: { status: 'saiu_entrega', label: 'Saiu para entrega' },
  saiu_entrega: { status: 'entregue', label: 'Marcar como entregue' },
}

const STATUS_LABEL: Record<PedidoStatus, string> = {
  novo: 'Novo',
  aceito: 'Aceito',
  em_preparo: 'Em preparo',
  saiu_entrega: 'Saiu para entrega',
  entregue: 'Entregue',
  recusado: 'Recusado',
}

const STATUS_COR: Record<PedidoStatus, string> = {
  novo: 'bg-[#3A5630] text-white',
  aceito: 'bg-[#2E4030] text-[#C8D5C7]',
  em_preparo: 'bg-[#4A3A1A] text-[#E5C07B]',
  saiu_entrega: 'bg-[#1A3A4A] text-[#7BB8E5]',
  entregue: 'bg-[#192519] text-[#6A9960]',
  recusado: 'bg-[#281A1A] text-[#C47070]',
}

export default function PedidoCard({
  pedido,
  onAtualizado,
}: {
  pedido: Pedido
  onAtualizado: (id: number, status: PedidoStatus, motivo?: string) => void
}) {
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [recusando, setRecusando] = useState(false)
  const [motivo, setMotivo] = useState('')

  const proximo = PROXIMO_STATUS[pedido.status]
  const isFinal = pedido.status === 'entregue' || pedido.status === 'recusado'

  const atualizarStatus = async (status: PedidoStatus, motivoRecusa?: string) => {
    setErro(null)
    setCarregando(true)
    try {
      const resp = await fetch(`/api/pedidos/${pedido.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, motivo: motivoRecusa }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setErro(data.error || 'Não foi possível atualizar o pedido.')
        return
      }
      onAtualizado(pedido.id, status, motivoRecusa)
      setRecusando(false)
      setMotivo('')
    } catch {
      setErro('Falha de conexão. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#D0D8D0]">
            {pedido.codigo || `#${pedido.id}`} · {pedido.cliente_nome}
          </p>
          <p className="text-xs text-[#526550]">
            {pedido.cliente_fone} · {formatDataHora(pedido.criado_em)}
          </p>
        </div>
        <span className={`tag ${STATUS_COR[pedido.status]}`}>{STATUS_LABEL[pedido.status]}</span>
      </div>

      <p className="text-xs text-[#8AA087]">
        {pedido.endereco} — {pedido.bairro}
      </p>

      <ul className="space-y-1 border-t border-[#1C2920] pt-2 text-xs text-[#C8D5C7]">
        {pedido.pedido_itens.map((item) => (
          <li key={item.id} className="flex justify-between gap-2">
            <span>
              {item.quantidade}×{' '}
              {item.tipo === 'pizza'
                ? `Pizza ${item.tamanhos?.nome} — ${item.pedido_item_sabores.map((s) => s.sabores?.nome).join(' + ')} (borda ${item.bordas?.nome})`
                : item.bebidas?.nome}
            </span>
            <span className="tabular-nums text-[#526550]">{brl(item.preco_unit * item.quantidade)}</span>
          </li>
        ))}
      </ul>

      {pedido.observacao && (
        <p className="text-xs text-[#8A5050] italic">&quot;{pedido.observacao}&quot;</p>
      )}

      <div className="flex justify-between border-t border-[#1C2920] pt-2 text-sm font-bold text-[#E0E8DF]">
        <span>Total</span>
        <span className="preco">{brl(pedido.total)}</span>
      </div>

      {erro && <p className="text-xs text-[#C47070]">{erro}</p>}

      {!isFinal && (
        <div className="flex items-center gap-2 pt-1">
          {proximo && (
            <button
              type="button"
              disabled={carregando}
              onClick={() => atualizarStatus(proximo.status)}
              className="btn-primary disabled:opacity-50"
            >
              {proximo.label}
            </button>
          )}
          {!recusando ? (
            <button
              type="button"
              disabled={carregando}
              onClick={() => setRecusando(true)}
              className="btn-ghost"
            >
              Recusar
            </button>
          ) : null}
        </div>
      )}

      {recusando && (
        <div className="space-y-2 border-t border-[#1C2920] pt-2">
          <input
            type="text"
            placeholder="Motivo da recusa"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="campo"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={carregando || !motivo.trim()}
              onClick={() => atualizarStatus('recusado', motivo)}
              className="btn-primary disabled:opacity-50"
            >
              Confirmar recusa
            </button>
            <button type="button" onClick={() => setRecusando(false)} className="btn-ghost">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
