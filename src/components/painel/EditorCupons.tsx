'use client'

import { useState } from 'react'
import { brl, formatData } from '@/lib/format'
import { descricaoCupom, motivoCupomInvalido, type Cupom } from '@/lib/cupom-desconto'

const formVazio = { codigo: '', tipo: 'pct' as Cupom['tipo'], valor: '', pedido_minimo: '', valido_ate: '', max_usos: '' }

const numero = (v: string) => (v.trim() ? Number(v.replace(',', '.')) : null)

export default function EditorCupons({ inicial }: { inicial: Cupom[] }) {
  const [cupons, setCupons] = useState(inicial)
  const [form, setForm] = useState(formVazio)
  const [salvando, setSalvando] = useState(false)
  const [alterando, setAlterando] = useState<number | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [erroLista, setErroLista] = useState<string | null>(null)

  const campo = (k: keyof typeof formVazio) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value })),
  })

  const criar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    setSalvando(true)
    try {
      const resp = await fetch('/api/cupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: form.codigo,
          tipo: form.tipo,
          valor: numero(form.valor),
          pedido_minimo: numero(form.pedido_minimo),
          valido_ate: form.valido_ate || null,
          max_usos: numero(form.max_usos),
        }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setErro(data.error || 'Não foi possível criar o cupom.')
        return
      }
      setCupons((lista) => [data, ...lista])
      setForm(formVazio)
    } catch {
      setErro('Falha de conexão. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const alternar = async (c: Cupom) => {
    setErroLista(null)
    setAlterando(c.id)
    try {
      const resp = await fetch(`/api/cupons/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !c.ativo }),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setErroLista(data.error || 'Não foi possível salvar.')
        return
      }
      setCupons((lista) => lista.map((x) => (x.id === c.id ? data : x)))
    } catch {
      setErroLista('Falha de conexão. Tente novamente.')
    } finally {
      setAlterando(null)
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-[#526550] uppercase tracking-widest">Novo cupom</h2>
        <form onSubmit={criar} className="card space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs text-[#4D6150] mb-1">Código <span className="text-[#8A5050]">*</span></label>
              <input type="text" required {...campo('codigo')} placeholder="PIZZA10" className="campo uppercase" />
            </div>
            <div>
              <label className="block text-xs text-[#4D6150] mb-1">Tipo <span className="text-[#8A5050]">*</span></label>
              <select
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as Cupom['tipo'] }))}
                className="campo"
              >
                <option value="pct">Porcentagem (%)</option>
                <option value="valor">Valor fixo (R$)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#4D6150] mb-1">
                Desconto {form.tipo === 'pct' ? '(%)' : '(R$)'} <span className="text-[#8A5050]">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                required
                {...campo('valor')}
                placeholder={form.tipo === 'pct' ? '10' : '5,00'}
                className="campo"
              />
            </div>
            <div>
              <label className="block text-xs text-[#4D6150] mb-1">Pedido mínimo (R$)</label>
              <input type="text" inputMode="decimal" {...campo('pedido_minimo')} placeholder="Sem mínimo" className="campo" />
            </div>
            <div>
              <label className="block text-xs text-[#4D6150] mb-1">Vale até (inclusive)</label>
              <input type="date" {...campo('valido_ate')} className="campo" />
            </div>
            <div>
              <label className="block text-xs text-[#4D6150] mb-1">Limite de usos</label>
              <input type="text" inputMode="numeric" {...campo('max_usos')} placeholder="Sem limite" className="campo" />
            </div>
          </div>
          <p className="text-xs text-[#526550]">
            O desconto vale só sobre os itens (não sobre a entrega). Não soma com o desconto da loja toda em
            Promoções — o cliente fica com o maior dos dois. O limite de usos é no total, não por cliente.
          </p>
          {erro && <p className="text-xs text-[#C47070]">{erro}</p>}
          <button type="submit" disabled={salvando} className="btn-primary w-auto! disabled:opacity-50">
            {salvando ? 'Criando...' : 'Criar cupom'}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-[#526550] uppercase tracking-widest">Cupons</h2>
        {erroLista && <p className="text-xs text-[#C47070]">{erroLista}</p>}
        {cupons.length === 0 ? (
          <p className="text-sm text-[#526550]">Nenhum cupom criado ainda.</p>
        ) : (
          cupons.map((c) => {
            const motivo = motivoCupomInvalido(c)
            const valendo = !motivo
            const situacao = !c.ativo
              ? 'Desligado'
              : motivo === null
                ? 'Valendo'
                : c.max_usos !== null && c.usos >= c.max_usos
                  ? 'Esgotado'
                  : 'Vencido'
            return (
              <div key={c.id} className="card flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-[#D0D8D0]">
                    <span className="tracking-wider">{c.codigo}</span>{' '}
                    <span className={`ml-1 text-xs font-normal ${valendo ? 'text-[#6A9960]' : 'text-[#8A5050]'}`}>
                      {valendo ? '●' : '○'} {situacao}
                    </span>
                  </p>
                  <p className="text-xs text-[#8AA087]">
                    {descricaoCupom(c)}
                    {c.pedido_minimo !== null && ` · pedidos a partir de ${brl(c.pedido_minimo)}`}
                  </p>
                  <p className="text-xs text-[#526550] tabular-nums">
                    Usado {c.usos}
                    {c.max_usos !== null ? ` de ${c.max_usos}` : ''} {c.usos === 1 ? 'vez' : 'vezes'}
                    {c.valido_ate && ` · vale até ${formatData(c.valido_ate)}`}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={alterando === c.id}
                  onClick={() => alternar(c)}
                  className="btn-primary w-auto! disabled:opacity-50"
                >
                  {c.ativo ? 'Desligar' : 'Ligar'}
                </button>
              </div>
            )
          })
        )}
      </section>
    </div>
  )
}
