import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import PromocoesLoja from '@/components/painel/PromocoesLoja'
import PrecosPromocionais from '@/components/painel/PrecosPromocionais'
import type { Sabor, Tamanho } from '@/types/pizzaria'

export const dynamic = 'force-dynamic'

export default async function PromocoesPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/painel/login')
  }

  const [configRes, tamanhosRes, saboresRes] = await Promise.all([
    supabase
      .from('config_loja')
      .select('frete_gratis, desconto_pedido_ativo, desconto_pedido_pct')
      .eq('id', 1)
      .single(),
    supabase.from('tamanhos').select('*').order('ordem'),
    supabase
      .from('sabores')
      .select('id, nome, descricao, categoria, sabor_preco(tamanho_id, preco, preco_promo)')
      .eq('ativo', true)
      .order('nome'),
  ])

  const erro = configRes.error || tamanhosRes.error || saboresRes.error

  return (
    <main className="px-4 sm:px-6 py-8 pb-20">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between border-b border-[#1A2318] pb-4 mb-8">
          <h1
            className="text-xl font-bold text-[#D0D8D0]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Promoções
          </h1>
          <Link href="/painel" className="text-xs text-[#526550] hover:text-[#8AA087]">
            ← Voltar aos pedidos
          </Link>
        </div>

        {erro || !configRes.data ? (
          <p className="text-sm text-[#C47070]">Não foi possível carregar as promoções.</p>
        ) : (
          <div className="space-y-8">
            <PromocoesLoja inicial={configRes.data} />
            <PrecosPromocionais
              tamanhos={(tamanhosRes.data ?? []) as Tamanho[]}
              sabores={(saboresRes.data ?? []) as Sabor[]}
            />
          </div>
        )}
      </div>
    </main>
  )
}
