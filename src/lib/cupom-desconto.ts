import { brl, hojeISO } from '@/lib/format'
import { calcularDesconto } from '@/lib/promocao'
import type { Config } from '@/types/pizzaria'

/** Linha de `cupons` como o painel vê. */
export type Cupom = {
  id: number
  codigo: string
  /** 'frete' zera a taxa de entrega e não tem `valor`. */
  tipo: 'pct' | 'valor' | 'frete'
  valor: number | null
  pedido_minimo: number | null
  /** Último dia em que vale (inclusive), 'AAAA-MM-DD' no horário de Brasília. */
  valido_ate: string | null
  max_usos: number | null
  usos: number
  ativo: boolean
  criado_em: string
}

/** O que o checkout recebe de POST /api/cupons/validar (sem contagem de usos). */
export type CupomAplicado = Pick<Cupom, 'codigo' | 'tipo' | 'valor' | 'pedido_minimo'>

export const normalizarCodigo = (v: string) => v.trim().toUpperCase()

export const descricaoCupom = (c: Pick<Cupom, 'tipo' | 'valor'>) =>
  c.tipo === 'frete'
    ? 'Frete grátis'
    : c.tipo === 'pct'
      ? `${c.valor}% de desconto`
      : `${brl(c.valor ?? 0)} de desconto`

/** O carrinho atinge o pedido mínimo do cupom (subtotal dos itens, antes de descontos). */
export const atingeMinimoCupom = (subtotal: number, c: Pick<Cupom, 'pedido_minimo'>) =>
  c.pedido_minimo === null || subtotal >= c.pedido_minimo

/**
 * Por que o cupom não vale agora (para o cliente), ou null se vale.
 * Não confere `pedido_minimo` — isso depende do carrinho, ver `descontoCupom`.
 */
export const motivoCupomInvalido = (c: Pick<Cupom, 'ativo' | 'valido_ate' | 'max_usos' | 'usos'>) => {
  if (!c.ativo) return 'Esse cupom não está mais valendo.'
  if (c.valido_ate && c.valido_ate < hojeISO()) return 'Esse cupom já venceu.'
  if (c.max_usos !== null && c.usos >= c.max_usos) return 'Esse cupom já foi usado o máximo de vezes.'
  return null
}

/** Desconto do cupom sobre o subtotal dos itens (0 se não atingiu o mínimo ou se é de frete). */
export const descontoCupom = (subtotal: number, c: CupomAplicado) => {
  if (c.tipo === 'frete' || c.valor === null || !atingeMinimoCupom(subtotal, c)) return 0
  const v = c.tipo === 'pct' ? Math.round(subtotal * c.valor) / 100 : c.valor
  return Math.min(v, subtotal)
}

/**
 * Cupom de frete grátis vale neste pedido. Se o frete grátis da loja toda já
 * está ligado, o cupom não faz diferença e não é gastado.
 */
export const cupomZeraFrete = (
  subtotal: number,
  config: Pick<Config, 'frete_gratis'>,
  cupom: CupomAplicado | null
) => !!cupom && cupom.tipo === 'frete' && !config.frete_gratis && atingeMinimoCupom(subtotal, cupom)

/**
 * Desconto nos itens: cupom e desconto % da loja não se somam, vale o maior.
 * Cupom de frete não entra aqui (ver `cupomZeraFrete`) e soma com o da loja. Usado no checkout e em POST /api/pedidos (recusa se divergir).
 * `viaCupom` diz se foi o cupom que ganhou (aí o pedido grava o código).
 */
export const descontoDoPedido = (
  subtotal: number,
  config: Pick<Config, 'desconto_pedido_ativo' | 'desconto_pedido_pct'>,
  cupom: CupomAplicado | null
) => {
  const daLoja = calcularDesconto(subtotal, config)
  const doCupom = cupom ? descontoCupom(subtotal, cupom) : 0
  return doCupom > daLoja ? { valor: doCupom, viaCupom: true } : { valor: daLoja, viaCupom: false }
}

type CupomNovo = Omit<Cupom, 'id' | 'usos' | 'ativo' | 'criado_em'>

const numeroOpcional = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v))

/** Valida o corpo de POST /api/cupons (criação pelo painel). */
export const validarCupomNovo = (body: unknown): { cupom: CupomNovo } | { erro: string } => {
  const b = (body ?? {}) as Record<string, unknown>
  const codigo = typeof b.codigo === 'string' ? normalizarCodigo(b.codigo) : ''
  if (!/^[A-Z0-9_-]{3,30}$/.test(codigo)) {
    return { erro: 'O código precisa ter de 3 a 30 letras ou números, sem espaço nem acento.' }
  }
  if (b.tipo !== 'pct' && b.tipo !== 'valor' && b.tipo !== 'frete') return { erro: 'Escolha o tipo do desconto.' }
  const valor = b.tipo === 'frete' ? null : Number(b.valor)
  if (valor !== null && (!Number.isFinite(valor) || valor <= 0)) return { erro: 'Informe o valor do desconto.' }
  if (b.tipo === 'pct' && valor !== null && valor >= 100) {
    return { erro: 'O desconto em % precisa ser menor que 100.' }
  }

  const pedidoMinimo = numeroOpcional(b.pedido_minimo)
  if (pedidoMinimo !== null && (!Number.isFinite(pedidoMinimo) || pedidoMinimo <= 0)) {
    return { erro: 'Pedido mínimo do cupom inválido.' }
  }
  const maxUsos = numeroOpcional(b.max_usos)
  if (maxUsos !== null && (!Number.isInteger(maxUsos) || maxUsos <= 0)) {
    return { erro: 'O limite de usos precisa ser um número inteiro maior que zero.' }
  }
  const validoAte = b.valido_ate ? String(b.valido_ate) : null
  if (validoAte !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(validoAte) || validoAte < hojeISO())) {
    return { erro: 'A data de validade precisa ser hoje ou depois.' }
  }

  return {
    cupom: {
      codigo,
      tipo: b.tipo,
      valor: valor !== null ? Math.round(valor * 100) / 100 : null,
      pedido_minimo: pedidoMinimo !== null ? Math.round(pedidoMinimo * 100) / 100 : null,
      valido_ate: validoAte,
      max_usos: maxUsos,
    },
  }
}
