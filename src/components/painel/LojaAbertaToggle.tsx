'use client'

import { useState } from 'react'

export default function LojaAbertaToggle({ abertaInicial }: { abertaInicial: boolean }) {
  const [aberta, setAberta] = useState(abertaInicial)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const alternar = async () => {
    const nova = !aberta
    if (!nova && !confirm('Fechar a loja? Os clientes não vão conseguir finalizar pedidos.')) return

    setErro(null)
    setCarregando(true)
    try {
      const resp = await fetch('/api/loja/aberta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aberta: nova }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setErro(data.error || 'Não foi possível alterar a loja.')
        return
      }
      setAberta(data.aberta)
    } catch {
      setErro('Falha de conexão. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="card flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className={`text-sm font-semibold ${aberta ? 'text-[#6A9960]' : 'text-[#C47070]'}`}>
          {aberta ? '● Loja aberta' : '○ Loja fechada'}
        </p>
        <p className="text-xs text-[#526550]">
          {aberta ? 'Clientes podem fazer pedidos pelo site.' : 'O site não aceita pedidos novos.'}
        </p>
        {erro && <p className="text-xs text-[#C47070] mt-1">{erro}</p>}
      </div>
      <button
        type="button"
        disabled={carregando}
        onClick={alternar}
        className="btn-primary w-auto! disabled:opacity-50"
      >
        {carregando ? 'Salvando…' : aberta ? 'Fechar loja' : 'Abrir loja'}
      </button>
    </div>
  )
}
