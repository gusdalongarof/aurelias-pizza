export type Tamanho = {
  id: number
  nome: string
  fatias: number | null
  max_sabores: number
  ordem: number
}

export type SaborPreco = {
  tamanho_id: number
  preco: number
}

export type Sabor = {
  id: number
  nome: string
  descricao: string | null
  categoria: string
  sabor_preco: SaborPreco[]
}

export type Borda = {
  id: number
  nome: string
  preco_extra: number
}

export type Bebida = {
  id: number
  nome: string
  volume: string | null
  preco: number
}

export type Config = {
  id?: number
  aberta: boolean
  pedido_minimo: number
  /** @deprecated sem uso — entrega agora é calculada por distância, ver taxa_entrega_por_km */
  taxa_entrega_padrao: number
  taxa_entrega_por_km: number
  endereco_loja: string | null
  aviso_entrega: string | null
  telefone_whats?: string | null
  regra_meio_a_meio?: string | null
}

export type CartItemPizza = {
  id: string
  tipo: 'pizza'
  tamanho: Tamanho
  sabores: Sabor[]
  borda: Borda
  precoUnitario: number
  quantidade: number
}

export type CartItemBebida = {
  id: string
  tipo: 'bebida'
  bebida: Bebida
  precoUnitario: number
  quantidade: number
}

export type CartItem = CartItemPizza | CartItemBebida

export type FormaPagamento = 'pix' | 'cartao' | 'dinheiro'

export type DadosCliente = {
  nome: string
  telefone: string
  rua: string
  numero: string
  bairro: string
  complemento?: string
  formaPagamento: FormaPagamento
  trocoPara?: string
}
