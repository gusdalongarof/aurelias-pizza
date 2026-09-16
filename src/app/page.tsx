import { supabase } from '@/lib/supabase'
import ConfigSync from '@/components/ConfigSync'
import Header from '@/components/Header'
import MontadorPizza from '@/components/MontadorPizza'
import SecaoBebidas from '@/components/SecaoBebidas'
import CarrinhoDrawer from '@/components/CarrinhoDrawer'
import CarrinhoBarraFlutuante from '@/components/CarrinhoBarraFlutuante'
import { brl } from '@/lib/format'
import type { Tamanho, Sabor, Borda, Bebida, Config } from '@/types/pizzaria'

export const dynamic = 'force-dynamic'

export default async function Cardapio() {
  const [tamanhosRes, saboresRes, bordasRes, bebidasRes, configRes] = await Promise.all([
    supabase.from('tamanhos').select('*').order('ordem'),
    supabase
      .from('sabores')
      .select('id, nome, descricao, categoria, sabor_preco(tamanho_id, preco)')
      .order('nome'),
    supabase.from('bordas').select('*').order('preco_extra'),
    supabase.from('bebidas').select('*').order('nome'),
    supabase.from('config_loja').select('*').eq('id', 1).single(),
  ])

  const erro =
    tamanhosRes.error || saboresRes.error || bordasRes.error || bebidasRes.error || configRes.error

  if (erro) {
    return (
      <main className="min-h-screen bg-[#111613] px-6 py-16 text-[#F5F7F3]">
        <div className="mx-auto max-w-md">
          <h1 className="text-2xl font-serif text-[#E08585]">
            Não foi possível carregar o cardápio
          </h1>
          <p className="mt-3 text-[#A2B5A0]">
            Verifique as chaves no arquivo .env.local e reinicie o servidor.
          </p>
          <pre className="mt-6 overflow-x-auto rounded-xl bg-[#1C271F] p-4 text-sm text-[#E5A35D] border border-[#2B3B2E]">
            {erro.message}
          </pre>
        </div>
      </main>
    )
  }

  const tamanhos = (tamanhosRes.data ?? []) as Tamanho[]
  const sabores = (saboresRes.data ?? []) as Sabor[]
  const bordas = (bordasRes.data ?? []) as Borda[]
  const bebidas = (bebidasRes.data ?? []) as Bebida[]
  const config = configRes.data as Config

  const salgadas = sabores.filter((s) => s.categoria === 'salgada')
  const doces = sabores.filter((s) => s.categoria === 'doce')

  const preco = (sabor: Sabor, tamanhoId: number) =>
    sabor.sabor_preco.find((p) => p.tamanho_id === tamanhoId)?.preco

  const ListaSabores = ({ titulo, itens }: { titulo: string; itens: Sabor[] }) => (
    <section className="mt-10">
      {/* Cabeçalho com nome da categoria e colunas de tamanho */}
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-xs font-semibold text-[#526550] uppercase tracking-widest">
          {titulo}
        </h3>
        <div className="flex gap-5 sm:gap-8 text-[10px] font-semibold text-[#354136] uppercase tracking-widest">
          {tamanhos.map((t) => (
            <span key={t.id} className="w-14 sm:w-20 text-right">{t.nome}</span>
          ))}
        </div>
      </div>

      <ul className="divide-y divide-[#172018]">
        {itens.map((s) => (
          <li
            key={s.id}
            className="flex items-start justify-between gap-6 py-3.5"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#D0D8D0]">{s.nome}</p>
              {s.descricao && (
                <p className="mt-0.5 text-[11px] leading-relaxed text-[#3D5040]">{s.descricao}</p>
              )}
            </div>
            <div className="flex shrink-0 gap-5 sm:gap-8">
              {tamanhos.map((t) => {
                const p = preco(s, t.id)
                return (
                  <span
                    key={t.id}
                    className="w-14 sm:w-20 text-right tabular-nums text-sm preco"
                  >
                    {p ? brl(p) : <span className="text-[#2A3828]">—</span>}
                  </span>
                )
              })}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )

  return (
    <>
      <ConfigSync config={config} />
      <main className="min-h-screen bg-[#0D1410] px-4 sm:px-6 py-6 pb-36 text-[#E0E8DF]">
        <div className="mx-auto max-w-2xl">
          <Header config={config} />

          <MontadorPizza tamanhos={tamanhos} sabores={sabores} bordas={bordas} />

          <SecaoBebidas bebidas={bebidas} />

          {/* Cardápio de consulta */}
          <div className="mt-16">
            <div className="divider-ornate mb-8">Cardápio completo</div>

            {salgadas.length > 0 && <ListaSabores titulo="Pizzas salgadas" itens={salgadas} />}
            {doces.length > 0 && <ListaSabores titulo="Pizzas doces" itens={doces} />}

            {/* Bordas */}
            <div className="mt-12">
              <h3 className="text-xs font-semibold text-[#526550] uppercase tracking-widest mb-4">
                Bordas
              </h3>
              <ul className="divide-y divide-[#172018]">
                {bordas.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between py-3 text-sm"
                  >
                    <span className="text-[#C8D5C7]">{b.nome}</span>
                    <span className="tabular-nums text-[#526550]">
                      {b.preco_extra > 0 ? `+ ${brl(b.preco_extra)}` : 'inclusa'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-14 text-center text-[11px] leading-relaxed text-[#3D5040]">
            Cada pizza leva um sabor só, em qualquer tamanho.
          </p>
        </div>

        <CarrinhoDrawer />
        <CarrinhoBarraFlutuante />
      </main>
    </>
  )
}
