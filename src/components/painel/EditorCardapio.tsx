'use client'

import { useState } from 'react'
import { brl } from '@/lib/format'
import type { Sabor, Tamanho } from '@/types/pizzaria'

export type SaborPainel = Sabor & { ativo: boolean }

type Rascunho = {
  nome: string
  descricao: string
  categoria: 'salgada' | 'doce'
  ativo: boolean
  precos: Record<number, string>
}

const precoTexto = (n: number) => n.toFixed(2).replace('.', ',')

function rascunhoDe(s: SaborPainel | null, tamanhos: Tamanho[]): Rascunho {
  return {
    nome: s?.nome ?? '',
    descricao: s?.descricao ?? '',
    categoria: s?.categoria === 'doce' ? 'doce' : 'salgada',
    ativo: s?.ativo ?? true,
    precos: Object.fromEntries(
      tamanhos.map((t) => {
        const p = s?.sabor_preco.find((sp) => sp.tamanho_id === t.id)
        return [t.id, p ? precoTexto(p.preco) : '']
      })
    ),
  }
}

function FormSabor({
  sabor,
  tamanhos,
  onSalvo,
  onCancelar,
}: {
  sabor: SaborPainel | null
  tamanhos: Tamanho[]
  onSalvo: (s: SaborPainel) => void
  onCancelar: () => void
}) {
  const [r, setR] = useState(() => rascunhoDe(sabor, tamanhos))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)

    const precos = tamanhos.map((t) => ({
      tamanhoId: t.id,
      preco: Number(r.precos[t.id]?.trim().replace(',', '.')),
    }))
    if (!r.nome.trim()) {
      setErro('Informe o nome do sabor.')
      return
    }
    if (precos.some((p) => !(p.preco > 0))) {
      setErro('Informe o preço de todos os tamanhos.')
      return
    }

    setSalvando(true)
    try {
      const resp = await fetch(sabor ? `/api/sabores/${sabor.id}` : '/api/sabores', {
        method: sabor ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...r, precos }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setErro(data.error || 'Não foi possível salvar.')
        return
      }
      onSalvo(data)
    } catch {
      setErro('Falha de conexão. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={salvar} className="card space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <label className="block text-xs text-[#8AA087] space-y-1">
          <span>Nome</span>
          <input
            type="text"
            value={r.nome}
            maxLength={80}
            onChange={(e) => setR({ ...r, nome: e.target.value })}
            className="campo"
          />
        </label>
        <label className="block text-xs text-[#8AA087] space-y-1">
          <span>Tipo</span>
          <select
            value={r.categoria}
            onChange={(e) => setR({ ...r, categoria: e.target.value as Rascunho['categoria'] })}
            className="campo"
          >
            <option value="salgada">Salgada</option>
            <option value="doce">Doce</option>
          </select>
        </label>
      </div>

      <label className="block text-xs text-[#8AA087] space-y-1">
        <span>Ingredientes / descrição</span>
        <textarea
          value={r.descricao}
          maxLength={300}
          rows={2}
          onChange={(e) => setR({ ...r, descricao: e.target.value })}
          className="campo"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        {tamanhos.map((t) => {
          const promo = sabor?.sabor_preco.find((sp) => sp.tamanho_id === t.id)?.preco_promo
          return (
            <label key={t.id} className="block text-xs text-[#8AA087] space-y-1">
              <span>Preço {t.nome} (R$)</span>
              <input
                type="text"
                inputMode="decimal"
                value={r.precos[t.id] ?? ''}
                onChange={(e) => setR({ ...r, precos: { ...r.precos, [t.id]: e.target.value } })}
                placeholder="0,00"
                className="campo text-right"
              />
              {promo != null && (
                <span className="block text-[#C9A24F]">Em promoção por {brl(promo)}</span>
              )}
            </label>
          )
        })}
      </div>

      <label className="flex items-center gap-2 text-sm text-[#C8D5C7] cursor-pointer">
        <input
          type="checkbox"
          checked={r.ativo}
          onChange={(e) => setR({ ...r, ativo: e.target.checked })}
        />
        Aparece no cardápio
      </label>

      {erro && <p className="text-xs text-[#C47070]">{erro}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={salvando}
          className="rounded-lg bg-[#3A5630] hover:bg-[#47683B] disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white cursor-pointer"
        >
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={salvando}
          className="rounded-lg border border-[#1C2920] px-4 py-2 text-sm text-[#8AA087] cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

export default function EditorCardapio({
  tamanhos,
  sabores: iniciais,
}: {
  tamanhos: Tamanho[]
  sabores: SaborPainel[]
}) {
  const [sabores, setSabores] = useState(iniciais)
  // id do sabor em edição, 'novo' para o formulário de sabor novo
  const [editando, setEditando] = useState<number | 'novo' | null>(null)

  const salvo = (s: SaborPainel) => {
    setSabores((prev) => {
      const lista = prev.some((p) => p.id === s.id)
        ? prev.map((p) => (p.id === s.id ? s : p))
        : [...prev, s]
      return lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    })
    setEditando(null)
  }

  const grupos = [
    { titulo: 'Pizzas salgadas', itens: sabores.filter((s) => s.categoria !== 'doce') },
    { titulo: 'Pizzas doces', itens: sabores.filter((s) => s.categoria === 'doce') },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#526550] max-w-md">
          As mudanças valem na hora no site. Pedidos já feitos mantêm o preço da época.
          Sabor que saiu do cardápio fica aqui embaixo, desmarcado, para voltar quando quiser.
        </p>
        {editando !== 'novo' && (
          <button
            type="button"
            onClick={() => setEditando('novo')}
            className="rounded-lg bg-[#3A5630] hover:bg-[#47683B] px-4 py-2 text-sm font-semibold text-white cursor-pointer"
          >
            + Novo sabor
          </button>
        )}
      </div>

      {editando === 'novo' && (
        <FormSabor sabor={null} tamanhos={tamanhos} onSalvo={salvo} onCancelar={() => setEditando(null)} />
      )}

      {grupos.map((g) => (
        <section key={g.titulo} className="space-y-2">
          <h2 className="text-xs font-semibold text-[#526550] uppercase tracking-widest">{g.titulo}</h2>
          <ul className="space-y-2">
            {g.itens.map((s) =>
              editando === s.id ? (
                <li key={s.id}>
                  <FormSabor
                    sabor={s}
                    tamanhos={tamanhos}
                    onSalvo={salvo}
                    onCancelar={() => setEditando(null)}
                  />
                </li>
              ) : (
                <li
                  key={s.id}
                  className={`card flex flex-wrap items-center justify-between gap-3 ${s.ativo ? '' : 'opacity-60'}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#D0D8D0]">
                      {s.nome}
                      {!s.ativo && (
                        <span className="ml-2 text-xs font-normal text-[#C47070]">fora do cardápio</span>
                      )}
                    </p>
                    {s.descricao && <p className="text-xs text-[#526550] truncate">{s.descricao}</p>}
                    <p className="mt-1 text-xs text-[#8AA087] tabular-nums">
                      {tamanhos
                        .map((t) => {
                          const p = s.sabor_preco.find((sp) => sp.tamanho_id === t.id)
                          return `${t.nome} ${p ? brl(p.preco) : '—'}`
                        })
                        .join(' · ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditando(s.id)}
                    className="text-xs text-[#8AA087] hover:text-[#C8D5C7] underline cursor-pointer"
                  >
                    Editar
                  </button>
                </li>
              )
            )}
          </ul>
        </section>
      ))}
    </div>
  )
}
