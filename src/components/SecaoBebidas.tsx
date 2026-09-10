'use client'

import React from 'react'
import type { Bebida } from '@/types/pizzaria'
import { useCart } from '@/context/CartContext'

interface SecaoBebidasProps {
  bebidas: Bebida[]
}

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function SecaoBebidas({ bebidas }: SecaoBebidasProps) {
  const { adicionarBebida, obterQuantidadeBebida } = useCart()

  if (!bebidas?.length) return null

  return (
    <section className="mt-12">
      <div className="divider-ornate mb-6">Bebidas</div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {bebidas.map((bebida) => {
          const qtd = obterQuantidadeBebida(bebida.id)

          return (
            <div
              key={bebida.id}
              className={`flex items-center justify-between rounded-xl p-4 border ${
                qtd > 0 ? 'border-[#4A6A3F] bg-[#192519]' : 'border-[#1C2920] bg-[#111813]'
              }`}
            >
              <div className="min-w-0 pr-3">
                <div className="text-sm font-medium text-[#E0E8DF]">{bebida.nome}</div>
                <div className="mt-0.5 text-xs text-[#4D6150]">
                  {bebida.volume && <span>{bebida.volume} · </span>}
                  <span className="preco">{brl(bebida.preco)}</span>
                </div>
              </div>

              <div className="shrink-0">
                {qtd > 0 ? (
                  <div className="flex items-center gap-1 rounded-lg bg-[#0E1510] border border-[#1C2920] p-1">
                    <button
                      type="button"
                      onClick={() => adicionarBebida(bebida, -1)}
                      className="h-7 w-7 flex items-center justify-center rounded-md text-sm text-[#C8D5C7] hover:bg-[#1C2920] cursor-pointer"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-xs font-bold text-[#E0E8DF] tabular-nums">{qtd}</span>
                    <button
                      type="button"
                      onClick={() => adicionarBebida(bebida, 1)}
                      className="h-7 w-7 flex items-center justify-center rounded-md text-sm bg-[#3A5630] text-white hover:bg-[#47683B] cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => adicionarBebida(bebida, 1)}
                    className="rounded-lg border border-[#2A3E29] bg-[#0E1510] px-3 py-1.5 text-xs text-[#8AA087] hover:border-[#3A5630] hover:text-[#D5E6D3] cursor-pointer"
                  >
                    + Adicionar
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
