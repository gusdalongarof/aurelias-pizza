'use client'

import React from 'react'
import Link from 'next/link'
import type { Config } from '@/types/pizzaria'
import { useCart } from '@/context/CartContext'
import { brl, formatTelefone } from '@/lib/format'

interface HeaderProps {
  config: Config
}

export default function Header({ config }: HeaderProps) {
  const { quantidadeTotal, subtotal, abrirCarrinho } = useCart()
  const whats = config.telefone_whats?.replace(/\D/g, '')

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

        {whats && (
          <div className="mt-5 flex flex-col items-center gap-2">
            <p className="text-xs text-[#627060]">
              WhatsApp da pizzaria:{' '}
              <span className="font-semibold text-[#C8D5C7] tabular-nums">{formatTelefone(whats)}</span>
            </p>
            <a
              href={`https://wa.me/${whats}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#2F5A36] bg-[#14301B] px-4 py-2 text-xs font-semibold text-[#B8E6C1] hover:border-[#4C8F57] hover:bg-[#1A3D23] transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 01-4.79-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.4 9.4 0 01-1.44-5.01c0-5.2 4.23-9.43 9.44-9.43 2.52 0 4.89.98 6.67 2.77a9.37 9.37 0 012.76 6.67c0 5.2-4.24 9.43-9.44 9.43m8.03-17.46A11.27 11.27 0 0012.05.72C5.79.72.7 5.8.7 12.06c0 2 .52 3.95 1.52 5.67L.6 23.6l6.01-1.58a11.3 11.3 0 005.43 1.38h.01c6.25 0 11.34-5.09 11.34-11.34 0-3.03-1.18-5.88-3.32-8.02" />
              </svg>
              Chamar no WhatsApp
            </a>
          </div>
        )}

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
