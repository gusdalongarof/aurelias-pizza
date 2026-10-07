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

  const body = (await request.json()) as Record<string, unknown>
  const alteracoes: {
    frete_gratis?: boolean
    desconto_pedido_ativo?: boolean
    desconto_pedido_pct?: number
  } = {}

  if ('frete_gratis' in body) {
    if (typeof body.frete_gratis !== 'boolean') {
      return NextResponse.json({ error: 'Valor inválido.' }, { status: 400 })
    }
    alteracoes.frete_gratis = body.frete_gratis
  }
  if ('desconto_pedido_ativo' in body) {
    if (typeof body.desconto_pedido_ativo !== 'boolean') {
      return NextResponse.json({ error: 'Valor inválido.' }, { status: 400 })
    }
    alteracoes.desconto_pedido_ativo = body.desconto_pedido_ativo
  }
  if ('desconto_pedido_pct' in body) {
    const pct = body.desconto_pedido_pct
    if (typeof pct !== 'number' || !Number.isFinite(pct) || pct <= 0 || pct >= 100) {
      return NextResponse.json({ error: 'O desconto precisa ser entre 1% e 99%.' }, { status: 400 })
    }
    alteracoes.desconto_pedido_pct = Math.round(pct * 100) / 100
  }
  if (Object.keys(alteracoes).length === 0) {
    return NextResponse.json({ error: 'Nada para alterar.' }, { status: 400 })
  }

  // Client da sessão, não service_role: o grant por coluna só deixa
  // `authenticated` alterar aberta/frete_gratis/desconto_pedido_*.
  const { data, error } = await supabase
    .from('config_loja')
    .update(alteracoes)
    .eq('id', 1)
    .select('frete_gratis, desconto_pedido_ativo, desconto_pedido_pct')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Não foi possível salvar a promoção.' }, { status: 500 })
  }

  return NextResponse.json(data)
}
