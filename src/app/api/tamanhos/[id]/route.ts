import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// Pausa/retoma as vendas de um tamanho pelo painel. Grant por coluna:
// `authenticated` só altera `vendas_pausadas` em tamanhos.
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
    return NextResponse.json({ error: 'Tamanho inválido.' }, { status: 400 })
  }

  const { vendas_pausadas } = (await request.json()) as { vendas_pausadas?: unknown }
  if (typeof vendas_pausadas !== 'boolean') {
    return NextResponse.json({ error: 'Valor inválido.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('tamanhos')
    .update({ vendas_pausadas })
    .eq('id', id)
    .select('*')
    .maybeSingle()
  if (error) {
    return NextResponse.json({ error: 'Não foi possível alterar o tamanho.' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Tamanho não encontrado.' }, { status: 404 })
  }

  return NextResponse.json(data)
}
