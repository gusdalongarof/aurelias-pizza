import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { SELECT_RASTREIO } from '@/lib/pedido-select'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Indisponível no momento.' }, { status: 500 })
  }

  const { data: pedido, error } = await supabaseAdmin
    .from('pedidos')
    .select(SELECT_RASTREIO)
    .eq('codigo', codigo.toUpperCase())
    .single()

  if (error || !pedido) {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 })
  }

  return NextResponse.json(pedido)
}
