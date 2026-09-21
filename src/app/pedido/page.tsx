'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function BuscarPedidoPage() {
  const router = useRouter()
  const [codigo, setCodigo] = useState('')

  const buscar = (e: FormEvent) => {
    e.preventDefault()
    const codigoLimpo = codigo.trim().toUpperCase()
    if (!codigoLimpo) return
    router.push(`/pedido/${encodeURIComponent(codigoLimpo)}`)
  }

  return (
    <main className="min-h-screen bg-[#0D1410] px-4 py-20 text-[#E0E8DF]">
      <div className="mx-auto max-w-sm text-center">
        <Link href="/" className="text-xs text-[#4D6150] hover:text-[#8AA087]">
          ← Voltar ao cardápio
        </Link>
        <h1
          className="mt-6 text-xl font-bold text-[#D0D8D0]"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Acompanhar pedido
        </h1>
        <p className="mt-2 text-sm text-[#3D5040]">
          Digite o código recebido na confirmação, ex: PED-00001.
        </p>
        <form onSubmit={buscar} className="mt-6 space-y-3">
          <input
            type="text"
            required
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="PED-00001"
            className="campo text-center uppercase"
          />
          <button type="submit" className="btn-primary">
            Buscar pedido
          </button>
        </form>
      </div>
    </main>
  )
}
