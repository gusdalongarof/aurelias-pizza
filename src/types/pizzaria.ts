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
  /** Preço promocional definido no painel; null = sem promoção. */
  preco_promo: number | null
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
  /** @deprecated sem uso — entrega é por bairro (tabela bairros) ou taxa_entrega_interior */
  taxa_entrega_padrao: number
  /** @deprecated sem uso — cálculo por distância (Google Maps) foi abandonado */
  taxa_entrega_por_km: number | null
  /** Taxa única para entregas fora da cidade (interior/zona rural). */
  taxa_entrega_interior: number
  endereco_loja: string | null
  aviso_entrega: string | null
  telefone_whats?: string | null
  regra_meio_a_meio?: string | null
  frete_gratis: boolean
  desconto_pedido_ativo: boolean
  desconto_pedido_pct: number
}

export type Bairro = {
  id: number
  nome: string
  taxa_entrega: number
  tempo_entrega_min: number | null
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
