import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// Liga/desliga um cupom pelo painel. Grant por coluna: `authenticated` só
// altera `ativo` (código, valor e usos não mudam depois de criado).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id)
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Cupom inválido.' }, { status: 400 })
  }

  const body = (await request.json()) as { ativo?: unknown }
  if (typeof body.ativo !== 'boolean') {
    return NextResponse.json({ error: 'Valor inválido.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('cupons')
    .update({ ativo: body.ativo })
    .eq('id', id)
    .select('*')
    .single()
  if (error || !data) {
    return NextResponse.json({ error: 'Não foi possível salvar o cupom.' }, { status: 500 })
  }

  return NextResponse.json(data)
}
