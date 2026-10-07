import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { calcularDesconto } from '@/lib/promocao'
import { calcularPrecosItens, centavos } from '@/lib/preco-pedido'
import type { NovoPedidoPayload } from '@/types/pedido'

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Partial<NovoPedidoPayload>
  const { cliente, endereco, pagamento, observacao, itens, subtotal, desconto, taxaEntrega, freteGratis } = body

  if (!cliente?.nome?.trim() || !cliente?.telefone?.trim()) {
    return NextResponse.json({ error: 'Informe nome e telefone do cliente.' }, { status: 400 })
  }
  if (!endereco?.rua?.trim() || !endereco?.numero?.trim() || !endereco?.bairro?.trim()) {
    return NextResponse.json({ error: 'Preencha o endereço completo.' }, { status: 400 })
  }
  if (!pagamento?.forma) {
    return NextResponse.json({ error: 'Escolha a forma de pagamento.' }, { status: 400 })
  }
  if (!Array.isArray(itens) || !itens.length) {
    return NextResponse.json({ error: 'O carrinho está vazio.' }, { status: 400 })
  }
  if (typeof subtotal !== 'number' || subtotal <= 0) {
    return NextResponse.json({ error: 'Subtotal inválido.' }, { status: 400 })
  }
  if (typeof taxaEntrega !== 'number' || !Number.isFinite(taxaEntrega) || taxaEntrega < 0) {
    return NextResponse.json({ error: 'Escolha o bairro de entrega.' }, { status: 400 })
  }
  if (endereco.bairroId !== null && !Number.isInteger(endereco.bairroId)) {
    return NextResponse.json({ error: 'Bairro inválido.' }, { status: 400 })
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
    .select('aberta, pedido_minimo, frete_gratis, desconto_pedido_ativo, desconto_pedido_pct, taxa_entrega_interior')
    .eq('id', 1)
    .single()

  if (configError || !config) {
    return NextResponse.json({ error: 'Não foi possível validar o pedido. Tente novamente.' }, { status: 500 })
  }
  if (!config.aberta) {
    return NextResponse.json({ error: 'A loja está fechada no momento.' }, { status: 422 })
  }
  // Preço de cada item sai do cardápio atual, não do que o navegador mandou.
  // Se divergir (promoção acabou com a pizza no carrinho, ou valor adulterado),
  // devolve os preços certos para o checkout atualizar o carrinho.
  const resultadoPrecos = await calcularPrecosItens(supabase, itens)
  if (!resultadoPrecos.ok) {
    return NextResponse.json({ error: resultadoPrecos.error }, { status: resultadoPrecos.status })
  }
  const { precos } = resultadoPrecos
  const subtotalServidor = centavos(itens.reduce((acc, item, i) => acc + precos[i] * item.quantidade, 0))
  const precoDivergente = itens.some(
    (item, i) => typeof item.precoUnitario !== 'number' || centavos(item.precoUnitario) !== precos[i]
  )
  if (precoDivergente || centavos(subtotal) !== subtotalServidor) {
    return NextResponse.json(
      {
        error: 'Os preços de alguns itens mudaram. Confira o total atualizado e finalize de novo.',
        precos,
      },
      { status: 409 }
    )
  }

  if (subtotalServidor < config.pedido_minimo) {
    return NextResponse.json(
      { error: `Pedido mínimo de R$ ${config.pedido_minimo.toFixed(2)}.` },
      { status: 422 }
    )
  }

  // Promoções valem pelo que está no banco agora, não pelo que o navegador
  // mandou. Se mudaram desde que o cliente abriu a página, recusa em vez de
  // gravar um total diferente do que ele viu.
  const descontoAtual = calcularDesconto(subtotal, config)
  if (freteGratis && !config.frete_gratis) {
    return NextResponse.json(
      { error: 'O frete grátis foi encerrado. Recarregue a página para ver a taxa de entrega.' },
      { status: 409 }
    )
  }
  if (desconto !== descontoAtual) {
    return NextResponse.json(
      { error: 'As promoções mudaram. Recarregue a página para ver os valores atualizados.' },
      { status: 409 }
    )
  }

  // Taxa sai da tabela de bairros (ou da taxa única do interior), não do
  // valor que o navegador mandou.
  let taxaTabela = config.taxa_entrega_interior
  let nomeBairro = `Interior — ${endereco.bairro.trim()}`
  if (endereco.bairroId !== null) {
    const { data: bairro } = await supabase
      .from('bairros')
      .select('nome, taxa_entrega')
      .eq('id', endereco.bairroId)
      .single()
    if (!bairro) {
      return NextResponse.json(
        { error: 'Não entregamos nesse bairro. Recarregue a página e escolha outro.' },
        { status: 422 }
      )
    }
    taxaTabela = bairro.taxa_entrega
    nomeBairro = bairro.nome
  }
  const taxa = config.frete_gratis ? 0 : taxaTabela
  if (!config.frete_gratis && taxaEntrega !== taxa) {
    return NextResponse.json(
      { error: 'A taxa de entrega mudou. Recarregue a página para ver o valor atualizado.' },
      { status: 409 }
    )
  }

  const total = centavos(subtotalServidor - descontoAtual + taxa)
  const troco = pagamento.trocoPara?.trim() ? Number(pagamento.trocoPara.replace(',', '.')) : null

  const { data: pedido, error: pedidoError } = await supabaseAdmin
    .from('pedidos')
    .insert({
      codigo: `TMP${Math.random().toString(36).slice(2, 9)}`,
      cliente_nome: cliente.nome.trim(),
      cliente_fone: cliente.telefone.trim(),
      tipo_entrega: 'entrega',
      endereco: `${endereco.rua.trim()}, ${endereco.numero.trim()}${endereco.complemento?.trim() ? ` - ${endereco.complemento.trim()}` : ''}`,
      bairro: nomeBairro,
      bairro_id: endereco.bairroId,
      forma_pagamento: pagamento.forma,
      troco_para: troco && !Number.isNaN(troco) ? troco : null,
      observacao: observacao?.trim() || null,
      subtotal: subtotalServidor,
      desconto: descontoAtual,
      taxa_entrega: taxa,
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
      itens.map((item, i) => ({
        pedido_id: pedido.id,
        tipo: item.tipo,
        tamanho_id: item.tipo === 'pizza' ? item.tamanhoId : null,
        borda_id: item.tipo === 'pizza' ? item.bordaId : null,
        bebida_id: item.tipo === 'bebida' ? item.bebidaId : null,
        quantidade: item.quantidade,
        preco_unit: precos[i],
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

  return NextResponse.json({ id: pedido.id, codigo, total, desconto: descontoAtual, taxaEntrega: taxa }, { status: 201 })
}
