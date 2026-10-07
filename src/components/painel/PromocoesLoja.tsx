'use client'

import { useState } from 'react'

type Promocoes = {
  frete_gratis: boolean
  desconto_pedido_ativo: boolean
  desconto_pedido_pct: number
}

export default function PromocoesLoja({ inicial }: { inicial: Promocoes }) {
  const [promo, setPromo] = useState(inicial)
  const [pct, setPct] = useState(inicial.desconto_pedido_pct > 0 ? String(inicial.desconto_pedido_pct) : '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const salvar = async (alteracoes: Partial<Promocoes>) => {
    setErro(null)
    setSalvando(true)
    try {
      const resp = await fetch('/api/loja/promocoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alteracoes),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setErro(data.error || 'Não foi possível salvar.')
        return
      }
      setPromo(data)
    } catch {
      setErro('Falha de conexão. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const alternarDesconto = () => {
    if (promo.desconto_pedido_ativo) {
      salvar({ desconto_pedido_ativo: false })
      return
    }
    const valor = Number(pct.replace(',', '.'))
    if (!pct.trim() || Number.isNaN(valor)) {
      setErro('Informe a porcentagem do desconto.')
      return
    }
    salvar({ desconto_pedido_pct: valor, desconto_pedido_ativo: true })
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold text-[#526550] uppercase tracking-widest">Na loja toda</h2>

      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={`text-sm font-semibold ${promo.frete_gratis ? 'text-[#6A9960]' : 'text-[#8AA087]'}`}>
            {promo.frete_gratis ? '● Frete grátis ligado' : '○ Frete grátis desligado'}
          </p>
          <p className="text-xs text-[#526550]">
            {promo.frete_gratis
              ? 'Nenhum pedido paga entrega enquanto estiver ligado.'
              : 'A entrega é cobrada pela taxa de cada bairro, normalmente.'}
          </p>
        </div>
        <button
          type="button"
          disabled={salvando}
          onClick={() => salvar({ frete_gratis: !promo.frete_gratis })}
          className="btn-primary w-auto! disabled:opacity-50"
        >
          {promo.frete_gratis ? 'Desligar frete grátis' : 'Ligar frete grátis'}
        </button>
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={`text-sm font-semibold ${promo.desconto_pedido_ativo ? 'text-[#6A9960]' : 'text-[#8AA087]'}`}>
            {promo.desconto_pedido_ativo
              ? `● ${promo.desconto_pedido_pct}% de desconto ligado`
              : '○ Desconto no pedido desligado'}
          </p>
          <p className="text-xs text-[#526550]">
            Desconto sobre o valor dos itens (não sobre a entrega).
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!promo.desconto_pedido_ativo && (
            <div className="flex items-center gap-1">
              <input
                type="text"
                inputMode="decimal"
                value={pct}
                onChange={(e) => setPct(e.target.value)}
                placeholder="10"
                className="campo w-20! text-right"
              />
              <span className="text-sm text-[#8AA087]">%</span>
            </div>
          )}
          <button
            type="button"
            disabled={salvando}
            onClick={alternarDesconto}
            className="btn-primary w-auto! disabled:opacity-50"
          >
            {promo.desconto_pedido_ativo ? 'Desligar desconto' : 'Ligar desconto'}
          </button>
        </div>
      </div>

      {erro && <p className="text-xs text-[#C47070]">{erro}</p>}
    </section>
  )
}
