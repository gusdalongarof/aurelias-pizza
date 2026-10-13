import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { motivoCupomInvalido, normalizarCodigo } from '@/lib/cupom-desconto'

// Checkout (sem login) confere um cupom digitado pelo cliente. Lê com
// service_role porque `anon` não tem SELECT em cupons — senão dava para
// listar todos os códigos. Devolve só o necessário para calcular o desconto.
export async function POST(request: NextRequest) {
  const body = (await request.json()) as { codigo?: unknown }
  const codigo = typeof body.codigo === 'string' ? normalizarCodigo(body.codigo) : ''
  if (!codigo || codigo.length > 30) {
    return NextResponse.json({ error: 'Digite o código do cupom.' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Não foi possível conferir o cupom agora.' }, { status: 500 })
  }

  const { data: cupom } = await supabaseAdmin
    .from('cupons')
    .select('codigo, tipo, valor, pedido_minimo, valido_ate, max_usos, usos, ativo')
    .eq('codigo', codigo)
    .maybeSingle()

  if (!cupom) {
    return NextResponse.json({ error: 'Cupom não encontrado.' }, { status: 404 })
  }
  const motivo = motivoCupomInvalido(cupom)
  if (motivo) {
    return NextResponse.json({ error: motivo }, { status: 422 })
  }

  return NextResponse.json({
    codigo: cupom.codigo,
    tipo: cupom.tipo,
    valor: Number(cupom.valor),
    pedido_minimo: cupom.pedido_minimo === null ? null : Number(cupom.pedido_minimo),
  })
}
