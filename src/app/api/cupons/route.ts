import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { validarCupomNovo } from '@/lib/cupom-desconto'

// Cria um cupom de desconto pelo painel. Client da sessão (RLS: painel_cria_cupons).
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const v = validarCupomNovo(await request.json())
  if ('erro' in v) {
    return NextResponse.json({ error: v.erro }, { status: 400 })
  }

  const { data, error } = await supabase.from('cupons').insert(v.cupom).select('*').single()
  if (error?.code === '23505') {
    return NextResponse.json({ error: `Já existe um cupom ${v.cupom.codigo}.` }, { status: 409 })
  }
  if (error || !data) {
    return NextResponse.json({ error: 'Não foi possível criar o cupom.' }, { status: 500 })
  }

  return NextResponse.json(data)
}
