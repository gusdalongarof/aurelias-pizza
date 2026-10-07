'use client'

import { useState } from 'react'
import { brl } from '@/lib/format'
import type { Sabor, Tamanho } from '@/types/pizzaria'

const chave = (saborId: number, tamanhoId: number) => `${saborId}-${tamanhoId}`

export default function PrecosPromocionais({
  tamanhos,
  sabores,
}: {
  tamanhos: Tamanho[]
  sabores: Sabor[]
}) {
  // Preço promocional salvo, por sabor × tamanho
  const [promos, setPromos] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(
      sabores.flatMap((s) => s.sabor_preco.map((p) => [chave(s.id, p.tamanho_id), p.preco_promo]))
    )
  )
  // Texto digitado e ainda não aplicado
  const [rascunho, setRascunho] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState<string | null>(null)
  const [erro, setErro] = useState<{ chave: string; msg: string } | null>(null)

  const salvar = async (saborId: number, tamanhoId: number, precoPromo: number | null) => {
    const k = chave(saborId, tamanhoId)
    setErro(null)
    setSalvando(k)
    try {
      const resp = await fetch('/api/sabores/preco-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saborId, tamanhoId, precoPromo }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setErro({ chave: k, msg: data.error || 'Não foi possível salvar.' })
        return
      }
      setPromos((prev) => ({ ...prev, [k]: data.preco_promo }))
      setRascunho((prev) => ({ ...prev, [k]: '' }))
    } catch {
      setErro({ chave: k, msg: 'Falha de conexão. Tente novamente.' })
    } finally {
      setSalvando(null)
    }
  }

  const aplicar = (saborId: number, tamanhoId: number) => {
    const k = chave(saborId, tamanhoId)
    const texto = rascunho[k]?.trim() ?? ''
    const valor = Number(texto.replace(',', '.'))
    if (!texto || Number.isNaN(valor) || valor <= 0) {
      setErro({ chave: k, msg: 'Informe o preço promocional.' })
      return
    }
    salvar(saborId, tamanhoId, valor)
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold text-[#526550] uppercase tracking-widest">
        Preço promocional por sabor
      </h2>
      <p className="text-xs text-[#526550]">
        O cardápio mostra o preço normal riscado e o promocional ao lado, até a promoção ser removida.
      </p>

      <ul className="space-y-2">
        {sabores.map((s) => (
          <li key={s.id} className="card space-y-2">
            <p className="text-sm font-medium text-[#D0D8D0]">{s.nome}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {tamanhos.map((t) => {
                const sp = s.sabor_preco.find((p) => p.tamanho_id === t.id)
                if (!sp) return null
                const k = chave(s.id, t.id)
                const promo = promos[k]
                return (
                  <div key={t.id} className="rounded-lg border border-[#1C2920] p-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#8AA087] tabular-nums">
                        {t.nome} ·{' '}
                        {promo != null ? (
                          <>
                            <span className="line-through text-[#4D6150]">{brl(sp.preco)}</span>{' '}
                            <span className="font-bold text-[#C9A24F]">{brl(promo)}</span>
                          </>
                        ) : (
                          brl(sp.preco)
                        )}
                      </span>
                      {promo != null ? (
                        <button
                          type="button"
                          disabled={salvando === k}
                          onClick={() => salvar(s.id, t.id, null)}
                          className="text-[#C47070] underline cursor-pointer disabled:opacity-50"
                        >
                          Remover promoção
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={rascunho[k] ?? ''}
                            onChange={(e) => setRascunho((prev) => ({ ...prev, [k]: e.target.value }))}
                            placeholder="R$"
                            className="campo w-20! py-1! text-right"
                          />
                          <button
                            type="button"
                            disabled={salvando === k}
                            onClick={() => aplicar(s.id, t.id)}
                            className="rounded-lg bg-[#3A5630] hover:bg-[#47683B] disabled:opacity-50 px-2.5 py-1.5 font-semibold text-white cursor-pointer"
                          >
                            Aplicar
                          </button>
                        </div>
                      )}
                    </div>
                    {erro?.chave === k && <p className="mt-1 text-[#C47070]">{erro.msg}</p>}
                  </div>
                )
              })}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
