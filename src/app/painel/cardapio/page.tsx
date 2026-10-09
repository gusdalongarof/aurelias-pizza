import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import EditorCardapio, { type SaborPainel } from '@/components/painel/EditorCardapio'
import type { Tamanho } from '@/types/pizzaria'

export const dynamic = 'force-dynamic'

export default async function CardapioPainelPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/painel/login')
  }

  // Pela sessão, a policy painel_le_sabores devolve também os desativados.
  const [tamanhosRes, saboresRes] = await Promise.all([
    supabase.from('tamanhos').select('*').order('ordem'),
    supabase
      .from('sabores')
      .select('id, nome, descricao, categoria, ativo, sabor_preco(tamanho_id, preco, preco_promo)')
      .order('nome'),
  ])

  const erro = tamanhosRes.error || saboresRes.error

  return (
    <main className="px-4 sm:px-6 py-8 pb-20">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between border-b border-[#1A2318] pb-4 mb-8">
          <h1
            className="text-xl font-bold text-[#D0D8D0]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Cardápio
          </h1>
          <Link href="/painel" className="text-xs text-[#526550] hover:text-[#8AA087]">
            ← Voltar aos pedidos
          </Link>
        </div>

        {erro ? (
          <p className="text-sm text-[#C47070]">Não foi possível carregar o cardápio.</p>
        ) : (
          <EditorCardapio
            tamanhos={(tamanhosRes.data ?? []) as Tamanho[]}
            sabores={(saboresRes.data ?? []) as SaborPainel[]}
          />
        )}
      </div>
    </main>
  )
}
