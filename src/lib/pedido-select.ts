/**
 * Colunas expostas ao rastreio público (por código). Deliberadamente sem
 * cliente_fone/endereco/bairro/observacao/forma_pagamento/troco_para: o
 * código é sequencial e previsível (PED-00001, PED-00002...), então qualquer
 * um pode tentar adivinhar um código válido — não é um token secreto.
 */
export const SELECT_RASTREIO = `
  codigo, status, criado_em, total,
  pedido_itens (
    id, tipo, quantidade, preco_unit,
    tamanhos ( nome ), bordas ( nome ), bebidas ( nome, volume ),
    pedido_item_sabores ( sabor_id, sabores ( nome ) )
  )
`
