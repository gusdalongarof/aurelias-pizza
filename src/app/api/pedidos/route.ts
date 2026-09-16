import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import type { NovoPedidoPayload } from '@/types/pedido'

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<NovoPedidoPayload>
  const { cliente, endereco, pagamento, observacao, itens, subtotal, taxaEntrega } = body

  if (!cliente?.nome?.trim() || !cliente?.telefone?.trim()) {
    return NextResponse.json({ error: 'Informe nome e telefone do cliente.' }, { status: 400 })
  }
  if (!endereco?.rua?.trim() || !endereco?.numero?.trim() || !endereco?.bairro?.trim()) {
    return NextResponse.json({ error: 'Preencha o endereço completo.' }, { status: 400 })
  }
  if (!pagamento?.forma) {
    return NextResponse.json({ error: 'Escolha a forma de pagamento.' }, { status: 400 })
  }
  if (!itens?.length) {
    return NextResponse.json({ error: 'O carrinho está vazio.' }, { status: 400 })
  }
  if (typeof subtotal !== 'number' || subtotal <= 0) {
    return NextResponse.json({ error: 'Subtotal inválido.' }, { status: 400 })
  }
  if (typeof taxaEntrega !== 'number' || !Number.isFinite(taxaEntrega) || taxaEntrega < 0) {
    return NextResponse.json({ error: 'Calcule o frete antes de enviar o pedido.' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Não foi possível registrar o pedido no momento. Fale com a loja pelo WhatsApp.' },
      { status: 500 }
    )
  }

  const { data: config, error: configError } = await supabase
    .from('config_loja')
    .select('aberta, pedido_minimo')
    .eq('id', 1)
    .single()

  if (configError || !config) {
    return NextResponse.json({ error: 'Não foi possível validar o pedido. Tente novamente.' }, { status: 500 })
  }
  if (!config.aberta) {
    return NextResponse.json({ error: 'A loja está fechada no momento.' }, { status: 422 })
  }
  if (subtotal < config.pedido_minimo) {
    return NextResponse.json(
      { error: `Pedido mínimo de R$ ${config.pedido_minimo.toFixed(2)}.` },
      { status: 422 }
    )
  }

  const total = Math.round((subtotal + taxaEntrega) * 100) / 100
  const troco = pagamento.trocoPara?.trim() ? Number(pagamento.trocoPara.replace(',', '.')) : null

  const { data: pedido, error: pedidoError } = await supabaseAdmin
    .from('pedidos')
    .insert({
      cliente_nome: cliente.nome.trim(),
      cliente_fone: cliente.telefone.trim(),
      tipo_entrega: 'entrega',
      endereco: `${endereco.rua.trim()}, ${endereco.numero.trim()}${endereco.complemento?.trim() ? ` - ${endereco.complemento.trim()}` : ''}`,
      bairro: endereco.bairro.trim(),
      forma_pagamento: pagamento.forma,
      troco_para: troco && !Number.isNaN(troco) ? troco : null,
      observacao: observacao?.trim() || null,
      subtotal,
      taxa_entrega: taxaEntrega,
      total,
      status: 'novo',
    })
    .select('id')
    .single()

  if (pedidoError || !pedido) {
    return NextResponse.json(
      { error: 'Não foi possível registrar o pedido. Tente novamente ou fale pelo WhatsApp.' },
      { status: 500 }
    )
  }

  const codigo = `PED-${String(pedido.id).padStart(5, '0')}`

  const falhar = async (mensagem: string) => {
    await supabaseAdmin.from('pedidos').delete().eq('id', pedido.id)
    return NextResponse.json({ error: mensagem }, { status: 500 })
  }

  const { error: codigoError } = await supabaseAdmin
    .from('pedidos')
    .update({ codigo })
    .eq('id', pedido.id)
  if (codigoError) {
    return falhar('Não foi possível registrar o pedido. Tente novamente ou fale pelo WhatsApp.')
  }

  const { data: itensInseridos, error: itensError } = await supabaseAdmin
    .from('pedido_itens')
    .insert(
      itens.map((item) => ({
        pedido_id: pedido.id,
        tipo: item.tipo,
        tamanho_id: item.tipo === 'pizza' ? item.tamanhoId : null,
        borda_id: item.tipo === 'pizza' ? item.bordaId : null,
        bebida_id: item.tipo === 'bebida' ? item.bebidaId : null,
        quantidade: item.quantidade,
        preco_unit: item.precoUnitario,
      }))
    )
    .select('id')

  if (itensError || !itensInseridos || itensInseridos.length !== itens.length) {
    return falhar('Não foi possível registrar o pedido. Tente novamente ou fale pelo WhatsApp.')
  }

  const saboresParaInserir = itens.flatMap((item, i) =>
    item.tipo === 'pizza'
      ? item.saborIds.map((saborId) => ({
          pedido_item_id: itensInseridos[i].id,
          sabor_id: saborId,
        }))
      : []
  )

  if (saboresParaInserir.length > 0) {
    const { error: saboresError } = await supabaseAdmin
      .from('pedido_item_sabores')
      .insert(saboresParaInserir)
    if (saboresError) {
      return falhar('Não foi possível registrar o pedido. Tente novamente ou fale pelo WhatsApp.')
    }
  }

  const { error: histError } = await supabaseAdmin
    .from('pedido_status_hist')
    .insert({ pedido_id: pedido.id, status: 'novo' })
  if (histError) {
    return falhar('Não foi possível registrar o pedido. Tente novamente ou fale pelo WhatsApp.')
  }

  return NextResponse.json({ id: pedido.id, codigo, total }, { status: 201 })
}
