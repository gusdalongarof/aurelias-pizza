'use client'

import { useEffect, useState } from 'react'
import { brl, formatDataHora } from '@/lib/format'
import { STATUS_LABEL, STATUS_COR, ORDEM_STATUS } from '@/lib/status-pedido'
import type { PedidoRastreio } from '@/types/pedido'

const POLL_MS = 10000

export default function RastreioPedido({
  pedidoInicial,
  codigo,
}: {
  pedidoInicial: PedidoRastreio
  codigo: string
}) {
  const [pedido, setPedido] = useState(pedidoInicial)

  useEffect(() => {
    const intervalo = setInterval(async () => {
      try {
        const resp = await fetch(`/api/pedidos/rastrear/${codigo}`)
        if (resp.ok) {
          setPedido(await resp.json())
        }
      } catch {
        // falha de rede pontual — tenta de novo no próximo ciclo
      }
    }, POLL_MS)
    return () => clearInterval(intervalo)
  }, [codigo])

  const isFinal = pedido.status === 'entregue' || pedido.status === 'recusado'
  const indiceAtual = ORDEM_STATUS.indexOf(pedido.status)

  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold text-[#526550] uppercase tracking-widest">Pedido</p>
          <p className="text-lg font-bold text-[#D0D8D0]">{pedido.codigo}</p>
          <p className="text-xs text-[#526550]">{formatDataHora(pedido.criado_em)}</p>
        </div>
        <span className={`tag ${STATUS_COR[pedido.status]}`}>{STATUS_LABEL[pedido.status]}</span>
      </div>

      {pedido.status === 'recusado' ? (
        <p className="text-sm text-[#C47070]">
          Esse pedido foi recusado pela loja. Qualquer dúvida, fale pelo WhatsApp.
        </p>
      ) : (
        <ol className="space-y-2.5 border-t border-[#1C2920] pt-4">
          {ORDEM_STATUS.map((status, i) => (
            <li
              key={status}
              className={`flex items-center gap-3 text-sm ${
                i <= indiceAtual ? 'text-[#C8D5C7]' : 'text-[#3D5040]'
              }`}
            >
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  i <= indiceAtual ? 'bg-[#6A9960]' : 'bg-[#1C2920]'
                }`}
              />
              {STATUS_LABEL[status]}
            </li>
          ))}
        </ol>
      )}

      <ul className="space-y-1 border-t border-[#1C2920] pt-4 text-xs text-[#C8D5C7]">
        {pedido.pedido_itens.map((item) => (
          <li key={item.id} className="flex justify-between gap-2">
            <span>
              {item.quantidade}×{' '}
              {item.tipo === 'pizza'
                ? `Pizza ${item.tamanhos?.nome} — ${item.pedido_item_sabores
                    .map((s) => s.sabores?.nome)
                    .join(' + ')} (borda ${item.bordas?.nome})`
                : `${item.bebidas?.nome}${item.bebidas?.volume ? ` (${item.bebidas.volume})` : ''}`}
            </span>
            <span className="tabular-nums text-[#526550]">{brl(item.preco_unit * item.quantidade)}</span>
          </li>
        ))}
      </ul>

      <div className="flex justify-between border-t border-[#1C2920] pt-3 text-sm font-bold text-[#E0E8DF]">
        <span>Total</span>
        <span className="preco">{brl(pedido.total)}</span>
      </div>

      {!isFinal && (
        <p className="text-center text-[11px] text-[#2E4030]">Esta página atualiza sozinha</p>
      )}
    </div>
  )
}
