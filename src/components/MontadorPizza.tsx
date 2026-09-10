'use client'

import React, { useState } from 'react'
import type { Tamanho, Sabor, Borda } from '@/types/pizzaria'
import { useCart } from '@/context/CartContext'

interface MontadorPizzaProps {
  tamanhos: Tamanho[]
  sabores: Sabor[]
  bordas: Borda[]
}

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function MontadorPizza({ tamanhos, sabores, bordas }: MontadorPizzaProps) {
  const { adicionarPizza, abrirCarrinho } = useCart()

  const [tamanhoId, setTamanhoId] = useState<number>(tamanhos[0]?.id ?? 0)
  const [saboresIds, setSaboresIds] = useState<number[]>([])
  const [bordaId, setBordaId] = useState<number>(bordas[0]?.id ?? 0)
  const [filtroCategoria, setFiltroCategoria] = useState<'todas' | 'salgada' | 'doce'>('todas')
  const [adicionado, setAdicionado] = useState(false)

  const tamanhoAtual = tamanhos.find((t) => t.id === tamanhoId) ?? tamanhos[0]
  const maxSabores = tamanhoAtual?.max_sabores ?? 1
  const bordaAtual = bordas.find((b) => b.id === bordaId) ?? bordas[0]

  const obterPreco = (sabor: Sabor, tId: number) =>
    sabor.sabor_preco.find((p) => p.tamanho_id === tId)?.preco ?? 0

  const handleTamanho = (novoId: number) => {
    const limite = tamanhos.find((t) => t.id === novoId)?.max_sabores ?? 1
    setTamanhoId(novoId)
    if (saboresIds.length > limite) setSaboresIds(saboresIds.slice(0, limite))
  }

  const toggleSabor = (saborId: number) => {
    setAdicionado(false)
    if (saboresIds.includes(saborId)) {
      setSaboresIds(saboresIds.filter((id) => id !== saborId))
    } else if (saboresIds.length < maxSabores) {
      setSaboresIds([...saboresIds, saborId])
    } else {
      setSaboresIds(maxSabores === 1 ? [saborId] : [saboresIds[0], saborId])
    }
  }

  const saboresSelecionados = sabores.filter((s) => saboresIds.includes(s.id))

  let precoBase = 0
  let detalhe = ''
  if (saboresSelecionados.length === 1) {
    precoBase = obterPreco(saboresSelecionados[0], tamanhoAtual.id)
    detalhe = brl(precoBase)
  } else if (saboresSelecionados.length > 1) {
    const precos = saboresSelecionados.map((s) => obterPreco(s, tamanhoAtual.id))
    precoBase = precos.reduce((a, b) => a + b, 0) / precos.length
    detalhe = `(${precos.map(brl).join(' + ')}) ÷ ${precos.length} = ${brl(precoBase)}`
  }

  const precoBorda = bordaAtual?.preco_extra ?? 0
  const precoTotal = precoBase > 0 ? precoBase + precoBorda : 0

  const saboresFiltrados = sabores.filter((s) =>
    filtroCategoria === 'todas' ? true : s.categoria === filtroCategoria
  )

  const handleAdicionar = () => {
    if (!saboresSelecionados.length) return
    adicionarPizza({ tamanho: tamanhoAtual, sabores: saboresSelecionados, borda: bordaAtual, precoUnitario: precoTotal })
    setSaboresIds([])
    setAdicionado(true)
    setTimeout(() => setAdicionado(false), 3500)
  }

  return (
    <section className="mt-2">
      {/* Título da seção */}
      <div className="divider-ornate mb-6">Monte sua pizza</div>

      {/* 1. Tamanho */}
      <div>
        <p className="text-xs font-semibold text-[#8AA087] uppercase tracking-widest mb-3">Tamanho</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tamanhos.map((t) => {
            const sel = t.id === tamanhoId
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTamanho(t.id)}
                className={`rounded-xl p-3.5 text-left border cursor-pointer ${
                  sel
                    ? 'border-[#4A6A3F] bg-[#192519]'
                    : 'border-[#1C2920] bg-[#111813] hover:border-[#2E4030]'
                }`}
              >
                <div className="font-semibold text-sm text-[#E0E8DF]">{t.nome}</div>
                <div className="mt-0.5 text-[11px] text-[#526550]">
                  {t.fatias ? `${t.fatias} fatias` : 'Broto'} · máx. {t.max_sabores} sabor{t.max_sabores > 1 ? 'es' : ''}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. Sabores */}
      <div className="mt-7">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-xs font-semibold text-[#8AA087] uppercase tracking-widest">
            Sabores&ensp;
            <span className="text-[#445A42] normal-case tracking-normal font-normal">
              {saboresIds.length}/{maxSabores} selecionado{saboresIds.length !== 1 ? 's' : ''}
              {maxSabores > 1 && ' — preço calculado pela média'}
            </span>
          </p>

          <div className="flex text-xs border border-[#1C2920] rounded-lg overflow-hidden">
            {(['todas', 'salgada', 'doce'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFiltroCategoria(cat)}
                className={`px-3 py-1 cursor-pointer ${
                  filtroCategoria === cat
                    ? 'bg-[#3A5630] text-[#D5E6D3]'
                    : 'text-[#526550] hover:text-[#D5E6D3]'
                }`}
              >
                {cat === 'todas' ? 'Todos' : cat === 'salgada' ? 'Salgadas' : 'Doces'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {saboresFiltrados.map((s) => {
            const sel = saboresIds.includes(s.id)
            const idx = saboresIds.indexOf(s.id)
            const preco = obterPreco(s, tamanhoAtual.id)

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSabor(s.id)}
                className={`flex items-start justify-between gap-3 rounded-xl p-3.5 text-left border cursor-pointer ${
                  sel
                    ? 'border-[#4A6A3F] bg-[#192519]'
                    : 'border-[#1C2920] bg-[#111813] hover:border-[#2E4030]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#E0E8DF]">{s.nome}</span>
                    {sel && (
                      <span className="text-[10px] font-bold text-[#6A9960] tracking-wide">
                        {maxSabores > 1 && saboresIds.length > 1 ? `½ (${idx + 1}ª)` : '✓'}
                      </span>
                    )}
                  </div>
                  {s.descricao && (
                    <p className="mt-0.5 text-[11px] text-[#4D6150] leading-relaxed line-clamp-2">
                      {s.descricao}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-sm preco">{preco > 0 ? brl(preco) : '—'}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. Borda */}
      <div className="mt-7">
        <p className="text-xs font-semibold text-[#8AA087] uppercase tracking-widest mb-3">Borda</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {bordas.map((b) => {
            const sel = b.id === bordaId
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setBordaId(b.id)}
                className={`flex items-center justify-between rounded-xl p-3.5 border cursor-pointer ${
                  sel
                    ? 'border-[#4A6A3F] bg-[#192519]'
                    : 'border-[#1C2920] bg-[#111813] hover:border-[#2E4030]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center ${
                    sel ? 'border-[#6A9960]' : 'border-[#384A37]'
                  }`}>
                    {sel && <div className="h-1.5 w-1.5 rounded-full bg-[#6A9960]" />}
                  </div>
                  <span className="text-sm text-[#D0DAD0]">{b.nome}</span>
                </div>
                <span className="text-xs text-[#526550] tabular-nums">
                  {b.preco_extra > 0 ? `+ ${brl(b.preco_extra)}` : 'inclusa'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Resumo + CTA */}
      <div className="mt-6 rounded-xl bg-[#0E1510] border border-[#1C2920] p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs text-[#4D6150]">
              {saboresSelecionados.length === 0
                ? 'Selecione pelo menos um sabor'
                : `${tamanhoAtual.nome} · ${saboresSelecionados
                    .map((s) => (maxSabores > 1 && saboresSelecionados.length > 1 ? `½ ${s.nome}` : s.nome))
                    .join(' + ')}`}
            </p>
            {saboresSelecionados.length > 0 && (
              <p className="mt-1 text-[11px] text-[#3D5040]">{detalhe}{precoBorda > 0 && ` + borda ${brl(precoBorda)}`}</p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xl font-bold tabular-nums text-[#C9A24F]">{brl(precoTotal)}</div>
          </div>
        </div>

        {adicionado && (
          <div className="mt-3 flex items-center justify-between text-xs text-[#6A9960]">
            <span>Pizza adicionada ao pedido.</span>
            <button type="button" onClick={abrirCarrinho} className="underline cursor-pointer">
              Ver carrinho →
            </button>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={saboresSelecionados.length === 0}
            onClick={handleAdicionar}
            className="btn-primary flex-1"
          >
            {saboresSelecionados.length === 0 ? 'Selecione o sabor' : `Adicionar ao pedido — ${brl(precoTotal)}`}
          </button>

          {saboresSelecionados.length > 0 && (
            <button
              type="button"
              onClick={() => setSaboresIds([])}
              className="rounded-xl border border-[#1C2920] px-3 text-xs text-[#4D6150] hover:text-[#C8D5C7] hover:border-[#2E4030] cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
