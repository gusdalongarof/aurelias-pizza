'use client'

import { useState } from 'react'
import type { Tamanho } from '@/types/pizzaria'

export default function PausaTamanhos({ tamanhos: iniciais }: { tamanhos: Tamanho[] }) {
  const [tamanhos, setTamanhos] = useState(iniciais)
  const [salvando, setSalvando] = useState<number | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const alternar = async (t: Tamanho) => {
    setErro(null)
    setSalvando(t.id)
    try {
      const resp = await fetch(`/api/tamanhos/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendas_pausadas: !t.vendas_pausadas }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setErro(data.error || 'Não foi possível salvar.')
        return
      }
      setTamanhos((prev) => prev.map((p) => (p.id === t.id ? (data as Tamanho) : p)))
    } catch {
      setErro('Falha de conexão. Tente novamente.')
    } finally {
      setSalvando(null)
    }
  }

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold text-[#526550] uppercase tracking-widest">Tamanhos</h2>
      <p className="text-xs text-[#526550]">
        Pausar um tamanho tira ele do pedido na hora (ex.: só Broto hoje). Os sabores e preços não mudam.
      </p>
      <ul className="space-y-2">
        {tamanhos.map((t) => (
          <li key={t.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={`text-sm font-semibold ${t.vendas_pausadas ? 'text-[#C47070]' : 'text-[#6A9960]'}`}>
                {t.vendas_pausadas ? `○ ${t.nome} pausada` : `● ${t.nome} à venda`}
              </p>
              <p className="text-xs text-[#526550]">
                {t.vendas_pausadas
                  ? 'Aparece como indisponível no site e não pode ser pedida.'
                  : 'Os clientes podem pedir normalmente.'}
              </p>
            </div>
            <button
              type="button"
              disabled={salvando !== null}
              onClick={() => alternar(t)}
              className="btn-primary w-auto! disabled:opacity-50"
            >
              {t.vendas_pausadas ? `Voltar a vender ${t.nome}` : `Pausar ${t.nome}`}
            </button>
          </li>
        ))}
      </ul>
      {erro && <p className="text-xs text-[#C47070]">{erro}</p>}
    </section>
  )
}
