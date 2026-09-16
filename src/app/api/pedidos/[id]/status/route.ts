import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { PedidoStatus } from '@/types/pedido'

const ORDEM: PedidoStatus[] = ['novo', 'aceito', 'em_preparo', 'saiu_entrega', 'entregue']

function transicaoValida(atual: PedidoStatus, proximo: PedidoStatus) {
  if (proximo === 'recusado') {
    return atual !== 'entregue' && atual !== 'recusado'
  }
  const indiceAtual = ORDEM.indexOf(atual)
  const indiceProximo = ORDEM.indexOf(proximo)
  return indiceAtual !== -1 && indiceProximo === indiceAtual + 1
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const { status, motivo } = (await request.json()) as { status?: PedidoStatus; motivo?: string }
  if (!status) {
    return NextResponse.json({ error: 'Informe o novo status.' }, { status: 400 })
  }
  if (status === 'recusado' && !motivo?.trim()) {
    return NextResponse.json({ error: 'Informe o motivo da recusa.' }, { status: 400 })
  }

  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .select('status')
    .eq('id', id)
    .single()

  if (pedidoError || !pedido) {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 })
  }

  if (!transicaoValida(pedido.status as PedidoStatus, status)) {
    return NextResponse.json({ error: 'Transição de status inválida.' }, { status: 422 })
  }

  const { error: updateError } = await supabase.from('pedidos').update({ status }).eq('id', id)
  if (updateError) {
    return NextResponse.json({ error: 'Não foi possível atualizar o pedido.' }, { status: 500 })
  }

  const { error: histError } = await supabase
    .from('pedido_status_hist')
    .insert({ pedido_id: Number(id), status, motivo: motivo?.trim() || null })
  if (histError) {
    return NextResponse.json({ error: 'Não foi possível registrar o histórico.' }, { status: 500 })
  }

  return NextResponse.json({ id: Number(id), status })
}
