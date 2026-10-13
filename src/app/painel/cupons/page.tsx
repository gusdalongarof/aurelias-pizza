import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import EditorCupons from '@/components/painel/EditorCupons'
import type { Cupom } from '@/lib/cupom-desconto'

export const dynamic = 'force-dynamic'

export default async function CuponsPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/painel/login')
  }

  const { data, error } = await supabase
    .from('cupons')
    .select('*')
    .order('criado_em', { ascending: false })

  return (
    <main className="px-4 sm:px-6 py-8 pb-20">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between border-b border-[#1A2318] pb-4 mb-8">
          <h1
            className="text-xl font-bold text-[#D0D8D0]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Cupons de desconto
          </h1>
          <Link href="/painel" className="text-xs text-[#526550] hover:text-[#8AA087]">
            ← Voltar aos pedidos
          </Link>
        </div>

        {error ? (
          <p className="text-sm text-[#C47070]">Não foi possível carregar os cupons.</p>
        ) : (
          <EditorCupons inicial={(data ?? []) as Cupom[]} />
        )}
      </div>
    </main>
  )
}
