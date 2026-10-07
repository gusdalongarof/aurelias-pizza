'use client'

import React, { useState } from 'react'

// Aparece assim que a página abre com a loja fechada. Fechar o aviso só
// libera a consulta do cardápio — o montador e o checkout continuam bloqueados.
export default function LojaFechadaAviso() {
  const [aberto, setAberto] = useState(true)

  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-black/75" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="loja-fechada-titulo"
        className="relative z-10 w-full max-w-sm rounded-2xl border border-[#4A2525] bg-[#1A1212] p-6 text-center shadow-2xl"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#2E1A1A] text-2xl">
          🔒
        </div>
        <h2
          id="loja-fechada-titulo"
          className="mt-4 text-xl font-bold text-[#F0D8D8]"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Estamos fechados no momento
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#B89090]">
          Não estamos aceitando pedidos agora. Você pode consultar o cardápio e
          voltar mais tarde para pedir.
        </p>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="btn-primary mt-6"
        >
          Ver cardápio
        </button>
      </div>
    </div>
  )
}

export function LojaFechadaCartao() {
  return (
    <div className="mt-2 rounded-xl border border-[#4A2525] bg-[#1A1212] px-5 py-6 text-center">
      <p className="text-sm font-semibold text-[#E0B0B0]">Loja fechada no momento</p>
      <p className="mt-1 text-xs text-[#9A7070]">
        Os pedidos estão pausados. Volte mais tarde para fazer seu pedido.
      </p>
    </div>
  )
}
