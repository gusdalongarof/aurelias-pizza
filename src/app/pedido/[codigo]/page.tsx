import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { SELECT_RASTREIO } from '@/lib/pedido-select'
import RastreioPedido from '@/components/RastreioPedido'
import type { PedidoRastreio } from '@/types/pedido'

export const dynamic = 'force-dynamic'

export default async function RastreioPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const codigoNormalizado = codigo.toUpperCase()

  const supabaseAdmin = getSupabaseAdmin()
  const { data: pedido } = supabaseAdmin
    ? await supabaseAdmin
        .from('pedidos')
        .select(SELECT_RASTREIO)
        .eq('codigo', codigoNormalizado)
        .single()
    : { data: null }

  if (!pedido) notFound()

  return (
    <main className="min-h-screen bg-[#0D1410] px-4 py-16 text-[#E0E8DF]">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-xs text-[#4D6150] hover:text-[#8AA087]">
          ← Voltar ao cardápio
        </Link>
        <h1
          className="mt-6 mb-6 text-xl font-bold text-[#D0D8D0]"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Acompanhar pedido
        </h1>
        <RastreioPedido pedidoInicial={pedido as unknown as PedidoRastreio} codigo={codigoNormalizado} />
      </div>
    </main>
  )
}
