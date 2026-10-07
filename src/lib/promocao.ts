import type { Config, SaborPreco } from '@/types/pizzaria'

/** Preço que vale agora: o promocional, se o painel definiu um, senão o normal. */
export const precoVigente = (sp: Pick<SaborPreco, 'preco' | 'preco_promo'>) =>
  sp.preco_promo ?? sp.preco

/**
 * Desconto % sobre o subtotal, arredondado ao centavo. Usado tanto no carrinho
 * quanto em POST /api/pedidos — o servidor recalcula e recusa se divergir.
 */
export const calcularDesconto = (
  subtotal: number,
  config: Pick<Config, 'desconto_pedido_ativo' | 'desconto_pedido_pct'>
) =>
  config.desconto_pedido_ativo && config.desconto_pedido_pct > 0
    ? Math.round(subtotal * config.desconto_pedido_pct) / 100
    : 0
