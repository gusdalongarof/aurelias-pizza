import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const { saborId, tamanhoId, precoPromo } = (await request.json()) as {
    saborId?: unknown
    tamanhoId?: unknown
    precoPromo?: unknown
  }
  if (!Number.isInteger(saborId) || !Number.isInteger(tamanhoId)) {
    return NextResponse.json({ error: 'Sabor/tamanho inválido.' }, { status: 400 })
  }
  if (precoPromo !== null && (typeof precoPromo !== 'number' || !Number.isFinite(precoPromo) || precoPromo <= 0)) {
    return NextResponse.json({ error: 'Preço promocional inválido.' }, { status: 400 })
  }

  // Grant por coluna: `authenticated` só altera preco_promo, nunca o preço normal.
  const { data, error } = await supabase
    .from('sabor_preco')
    .update({ preco_promo: precoPromo === null ? null : Math.round(precoPromo * 100) / 100 })
    .eq('sabor_id', saborId)
    .eq('tamanho_id', tamanhoId)
    .select('preco, preco_promo')
    .single()

  if (error?.code === '23514') {
    return NextResponse.json(
      { error: 'O preço promocional precisa ser menor que o preço normal.' },
      { status: 400 }
    )
  }
  if (error || !data) {
    return NextResponse.json({ error: 'Não foi possível salvar o preço.' }, { status: 500 })
  }

  return NextResponse.json(data)
}
