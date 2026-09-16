'use client'

import React from 'react'
import type { Config } from '@/types/pizzaria'
import { useCart } from '@/context/CartContext'

interface HeaderProps {
  config: Config
}

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function Header({ config }: HeaderProps) {
  const { quantidadeTotal, subtotal, abrirCarrinho } = useCart()

  return (
    <header>
      {/* Barra utilitária */}
      <div className="flex items-center justify-between py-4 border-b border-[#1A2318]">
        <span className={`text-[11px] font-semibold tracking-widest uppercase ${
          config.aberta ? 'text-[#6A9960]' : 'text-[#7A5050]'
        }`}>
          {config.aberta ? '● Aberto agora' : '○ Fechado no momento'}
        </span>

        <button
          type="button"
          onClick={abrirCarrinho}
          className="flex items-center gap-2 rounded-full border border-[#253228] bg-[#131A14] px-4 py-1.5 text-xs text-[#C8D5C7] hover:border-[#3A5230] hover:bg-[#182019] cursor-pointer"
        >
          <svg className="h-4 w-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          {quantidadeTotal > 0
            ? <span><span className="font-bold text-[#C9A24F]">{quantidadeTotal}</span> {quantidadeTotal === 1 ? 'item' : 'itens'} · {brl(subtotal)}</span>
            : <span>Carrinho</span>
          }
        </button>
      </div>

      {/* Identidade central */}
      <div className="py-12 flex flex-col items-center text-center">
        {/* Logo Aurelia's */}
        <div className="h-28 w-28 rounded-full bg-[#3A5630] flex flex-col items-center justify-center select-none shadow-lg">
          <span
            className="text-white text-xl font-bold leading-tight"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Aurelia&apos;S
          </span>
          <div className="mt-1 flex items-center gap-2 w-14 opacity-60">
            <div className="h-px flex-1 bg-white" />
            <span className="text-white text-[8px]">✦</span>
            <div className="h-px flex-1 bg-white" />
          </div>
          <span
            className="mt-0.5 text-white/80 text-[10px] tracking-[0.2em] lowercase"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            pizzaria
          </span>
        </div>

        <h1
          className="mt-5 text-2xl font-bold text-[#E8EDE7] tracking-tight"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Aurelia&apos;s Pizzaria
        </h1>
        <p className="mt-1.5 text-sm text-[#627060]">
          Massa artesanal · Ingredientes selecionados · Santa Rosa, RS
        </p>

        {/* Infos de entrega — simples, sem ícones */}
        <div className="mt-5 text-xs text-[#4D6150] space-y-1">
          <p>Entrega calculada pela distância &nbsp;·&nbsp; Pedido mínimo {brl(config.pedido_minimo)}</p>
          {config.aviso_entrega && (
            <p className="text-[#4A5A49]">{config.aviso_entrega}</p>
          )}
        </div>
      </div>
    </header>
  )
}
