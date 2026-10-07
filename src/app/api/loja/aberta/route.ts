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

  const { aberta } = (await request.json()) as { aberta?: unknown }
  if (typeof aberta !== 'boolean') {
    return NextResponse.json({ error: 'Valor inválido.' }, { status: 400 })
  }

  // Client da sessão, não service_role: o RLS + grant por coluna só deixam
  // `authenticated` alterar `aberta`.
  const { data, error } = await supabase
    .from('config_loja')
    .update({ aberta })
    .eq('id', 1)
    .select('aberta')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Não foi possível alterar a loja.' }, { status: 500 })
  }

  return NextResponse.json({ aberta: data.aberta })
}
