'use client'

import React from 'react'
import Link from 'next/link'
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

        <div className="flex items-center gap-3">
          {/* No celular fica só o botão grande abaixo do logo — aqui não cabe com o carrinho. */}
          <Link
            href="/pedido"
            className="hidden sm:inline-flex items-center rounded-full border border-[#4A3F20] bg-[#1A1710] px-4 py-1.5 text-xs font-semibold text-[#E0C27A] hover:border-[#C9A24F] hover:bg-[#241F12] transition-colors"
          >
            Acompanhar pedido
          </Link>
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
        <div className="mt-5 text-xs text-[#4D6150]">
          <p>Taxa de entrega por bairro &nbsp;·&nbsp; Pedido mínimo {brl(config.pedido_minimo)}</p>
        </div>

        <Link
          href="/pedido"
          className="mt-6 inline-flex items-center gap-2.5 rounded-xl border-2 border-[#C9A24F] bg-[#1A1710] px-5 py-3 text-sm font-semibold text-[#F2DDA4] hover:bg-[#241F12] transition-colors"
        >
          <svg className="h-5 w-5 text-[#C9A24F]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span>
            Já fez seu pedido? <span className="underline underline-offset-4">Acompanhar pedido</span>
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </header>
  )
}
