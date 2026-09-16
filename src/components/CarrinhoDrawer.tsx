'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function CarrinhoDrawer() {
  const router = useRouter()
  const {
    itens,
    isCartOpen,
    fecharCarrinho,
    alterarQuantidade,
    removerItem,
    limparCarrinho,
    observacao,
    setObservacao,
    subtotal,
    taxaEntrega,
    total,
    atingiuPedidoMinimo,
    valorRestantePedidoMinimo,
    quantidadeTotal,
  } = useCart()

  if (!isCartOpen) return null

  const handleIrParaCheckout = () => {
    if (!atingiuPedidoMinimo) return
    fecharCarrinho()
    router.push('/checkout')
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/60" onClick={fecharCarrinho} />

      <div className="relative z-10 flex h-full w-full max-w-sm flex-col bg-[#0D1410] border-l border-[#1A2318] text-[#E0E8DF]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A2318]">
          <div>
            <h2
              className="text-base font-bold text-[#E0E8DF]"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Meu Pedido
            </h2>
            {quantidadeTotal > 0 && (
              <p className="text-xs text-[#4D6150]">
                {quantidadeTotal} {quantidadeTotal === 1 ? 'item' : 'itens'}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={fecharCarrinho}
            className="btn-ghost text-base leading-none"
            title="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {itens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-3xl opacity-20 mb-4">🛒</p>
              <p className="text-sm text-[#3D5040]">Seu carrinho está vazio</p>
              <button
                type="button"
                onClick={fecharCarrinho}
                className="mt-5 text-xs text-[#526550] underline cursor-pointer"
              >
                Ver cardápio
              </button>
            </div>
          ) : (
            <>
              {itens.map((item) => {
                const sub = item.precoUnitario * item.quantidade
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[#1C2920] bg-[#111813] p-4"
                  >
                    {/* Título do item */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-[#526550] font-semibold uppercase tracking-wider">
                          {item.tipo === 'pizza' ? `Pizza ${item.tamanho.nome}` : 'Bebida'}
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-[#E0E8DF] leading-snug">
                          {item.tipo === 'pizza'
                            ? item.sabores.map((s) => item.sabores.length > 1 ? `½ ${s.nome}` : s.nome).join(' + ')
                            : item.bebida.nome
                          }
                        </p>
                        {item.tipo === 'pizza' && (
                          <p className="mt-0.5 text-[11px] text-[#3D5040]">Borda: {item.borda.nome}</p>
                        )}
                        {item.tipo === 'bebida' && item.bebida.volume && (
                          <p className="mt-0.5 text-[11px] text-[#3D5040]">{item.bebida.volume}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removerItem(item.id)}
                        className="btn-ghost text-[11px] shrink-0 mt-0.5"
                        title="Remover"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Controle de quantidade */}
                    <div className="mt-3 flex items-center justify-between border-t border-[#192319] pt-3">
                      <div className="flex items-center gap-1 rounded-lg bg-[#0E1510] border border-[#1C2920] p-1">
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(item.id, -1)}
                          className="h-6 w-6 flex items-center justify-center rounded-md text-xs text-[#8AA087] hover:bg-[#1C2920] cursor-pointer"
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-xs font-bold tabular-nums">{item.quantidade}</span>
                        <button
                          type="button"
                          onClick={() => alterarQuantidade(item.id, 1)}
                          className="h-6 w-6 flex items-center justify-center rounded-md text-xs bg-[#3A5630] text-white hover:bg-[#47683B] cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm font-bold preco tabular-nums">{brl(sub)}</span>
                    </div>
                  </div>
                )
              })}

              {/* Campo de observação */}
              <div className="rounded-xl border border-[#1C2920] bg-[#111813] p-4">
                <label className="block text-xs font-semibold text-[#526550] uppercase tracking-wider mb-2">
                  Observações
                </label>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Ex: sem cebola na ½ Calabresa, massa bem crocante..."
                  rows={2}
                  className="campo resize-none text-xs"
                />
              </div>
            </>
          )}
        </div>

        {/* Rodapé */}
        {itens.length > 0 && (
          <div className="border-t border-[#1A2318] p-5 space-y-4 bg-[#0D1410]">
            {!atingiuPedidoMinimo ? (
              <p className="text-xs text-[#7A6040]">
                Falta <strong className="text-[#C9A24F]">{brl(valorRestantePedidoMinimo)}</strong> para atingir o pedido mínimo.
              </p>
            ) : (
              <p className="text-xs text-[#4D6150]">✓ Pedido mínimo atingido</p>
            )}

            <div className="text-xs text-[#4D6150] space-y-1.5">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-[#C8D5C7] tabular-nums">{brl(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Entrega</span>
                <span className="text-[#C8D5C7] tabular-nums">
                  {taxaEntrega === null ? 'Calculada no checkout' : brl(taxaEntrega)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#1A2318] pt-2 text-sm font-bold text-[#E0E8DF]">
                <span>Total estimado</span>
                <span className="preco tabular-nums">{brl(total)}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={!atingiuPedidoMinimo}
              onClick={handleIrParaCheckout}
              className="btn-primary"
            >
              Finalizar Pedido →
            </button>

            <button
              type="button"
              onClick={limparCarrinho}
              className="btn-ghost w-full text-center"
            >
              Esvaziar carrinho
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
