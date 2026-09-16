import type { FormaPagamento } from './pizzaria'

export type PedidoStatus =
  | 'novo'
  | 'aceito'
  | 'em_preparo'
  | 'saiu_entrega'
  | 'entregue'
  | 'recusado'

export type PedidoItemSabor = {
  sabor_id: number
  sabores: { nome: string } | null
}

export type PedidoItem = {
  id: number
  tipo: 'pizza' | 'bebida'
  tamanho_id: number | null
  borda_id: number | null
  bebida_id: number | null
  quantidade: number
  preco_unit: number
  observacao: string | null
  tamanhos: { nome: string } | null
  bordas: { nome: string } | null
  bebidas: { nome: string; volume: string | null } | null
  pedido_item_sabores: PedidoItemSabor[]
}

export type Pedido = {
  id: number
  codigo: string | null
  cliente_nome: string
  cliente_fone: string
  tipo_entrega: string
  endereco: string | null
  bairro: string | null
  forma_pagamento: string
  troco_para: number | null
  observacao: string | null
  subtotal: number
  taxa_entrega: number
  total: number
  status: PedidoStatus
  criado_em: string
  pedido_itens: PedidoItem[]
}

export type NovoPedidoItemPayload =
  | {
      tipo: 'pizza'
      tamanhoId: number
      bordaId: number
      saborIds: number[]
      quantidade: number
      precoUnitario: number
    }
  | {
      tipo: 'bebida'
      bebidaId: number
      quantidade: number
      precoUnitario: number
    }

export type NovoPedidoPayload = {
  cliente: { nome: string; telefone: string }
  endereco: { rua: string; numero: string; bairro: string; complemento?: string }
  pagamento: { forma: FormaPagamento; trocoPara?: string }
  observacao?: string
  itens: NovoPedidoItemPayload[]
  subtotal: number
  taxaEntrega: number
}
