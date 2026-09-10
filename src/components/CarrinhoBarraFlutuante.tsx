'use client'

import React from 'react'
import { useCart } from '@/context/CartContext'

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function CarrinhoBarraFlutuante() {
  const { quantidadeTotal, subtotal, abrirCarrinho, isCartOpen } = useCart()

  if (quantidadeTotal === 0 || isCartOpen) return null

  return (
    <div className="fixed bottom-4 inset-x-4 z-40 mx-auto max-w-md">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#192519]/95 backdrop-blur-md px-5 py-3.5 border border-[#2E4030] shadow-xl">
        <div>
          <p className="text-[11px] text-[#4D6150] font-semibold uppercase tracking-wider">
            {quantidadeTotal} {quantidadeTotal === 1 ? 'item' : 'itens'}
          </p>
          <p className="text-base font-bold preco tabular-nums leading-tight">{brl(subtotal)}</p>
        </div>

        <button
          type="button"
          onClick={abrirCarrinho}
          className="btn-primary !w-auto px-5 py-2.5 !text-xs rounded-xl"
        >
          Ver Pedido →
        </button>
      </div>
    </div>
  )
}
