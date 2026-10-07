import type { SupabaseClient } from '@supabase/supabase-js'
import { precoVigente } from '@/lib/promocao'
import type { NovoPedidoItemPayload } from '@/types/pedido'
import type { SaborPreco } from '@/types/pizzaria'

export const centavos = (v: number) => Math.round(v * 100) / 100

export type ResultadoPrecos =
  | { ok: true; precos: number[] }
  | { ok: false; status: number; error: string }

const MAX_QUANTIDADE = 50

/**
 * Preço unitário de cada item pelo cardápio atual (promoção incluída), na
 * mesma ordem de `itens`. Lê pela chave anon, então item desativado
 * (`ativo = false`) some pelo RLS e o pedido é recusado.
 * Mesma conta do MontadorPizza: média dos sabores + borda.
 */
export async function calcularPrecosItens(
  supabase: SupabaseClient,
  itens: NovoPedidoItemPayload[]
): Promise<ResultadoPrecos> {
  const invalido = (error: string): ResultadoPrecos => ({ ok: false, status: 400, error })
  const indisponivel: ResultadoPrecos = {
    ok: false,
    status: 422,
    error: 'Um item do carrinho não está mais disponível. Remova-o e tente de novo.',
  }

  const pizzas = itens.filter((i) => i.tipo === 'pizza')
  const bebidas = itens.filter((i) => i.tipo === 'bebida')

  for (const item of itens) {
    if (!Number.isInteger(item.quantidade) || item.quantidade < 1 || item.quantidade > MAX_QUANTIDADE) {
      return invalido('Quantidade inválida no carrinho.')
    }
    if (item.tipo === 'pizza') {
      if (
        !Number.isInteger(item.tamanhoId) ||
        !Number.isInteger(item.bordaId) ||
        !Array.isArray(item.saborIds) ||
        item.saborIds.length === 0 ||
        !item.saborIds.every(Number.isInteger) ||
        new Set(item.saborIds).size !== item.saborIds.length
      ) {
        return invalido('Pizza inválida no carrinho.')
      }
    } else if (item.tipo === 'bebida') {
      if (!Number.isInteger(item.bebidaId)) return invalido('Bebida inválida no carrinho.')
    } else {
      return invalido('Item inválido no carrinho.')
    }
  }

  const unicos = (ids: number[]) => [...new Set(ids)]
  const tamanhoIds = unicos(pizzas.map((p) => p.tamanhoId))
  const bordaIds = unicos(pizzas.map((p) => p.bordaId))
  const saborIds = unicos(pizzas.flatMap((p) => p.saborIds))
  const bebidaIds = unicos(bebidas.map((b) => b.bebidaId))

  const vazio = { data: [], error: null }
  const [tamanhosRes, bordasRes, saboresRes, bebidasRes] = await Promise.all([
    tamanhoIds.length ? supabase.from('tamanhos').select('id, max_sabores').in('id', tamanhoIds) : vazio,
    bordaIds.length ? supabase.from('bordas').select('id, preco_extra').in('id', bordaIds) : vazio,
    saborIds.length
      ? supabase.from('sabores').select('id, sabor_preco(tamanho_id, preco, preco_promo)').in('id', saborIds)
      : vazio,
    bebidaIds.length ? supabase.from('bebidas').select('id, preco').in('id', bebidaIds) : vazio,
  ])

  if (tamanhosRes.error || bordasRes.error || saboresRes.error || bebidasRes.error) {
    return { ok: false, status: 500, error: 'Não foi possível validar o pedido. Tente novamente.' }
  }

  const tamanhos = new Map((tamanhosRes.data as { id: number; max_sabores: number }[]).map((t) => [t.id, t]))
  const bordas = new Map((bordasRes.data as { id: number; preco_extra: number }[]).map((b) => [b.id, b]))
  const sabores = new Map(
    (saboresRes.data as { id: number; sabor_preco: SaborPreco[] }[]).map((s) => [s.id, s])
  )
  const bebidasMap = new Map((bebidasRes.data as { id: number; preco: number }[]).map((b) => [b.id, b]))

  const precos: number[] = []
  for (const item of itens) {
    if (item.tipo === 'bebida') {
      const bebida = bebidasMap.get(item.bebidaId)
      if (!bebida) return indisponivel
      precos.push(centavos(Number(bebida.preco)))
      continue
    }

    const tamanho = tamanhos.get(item.tamanhoId)
    const borda = bordas.get(item.bordaId)
    if (!tamanho || !borda) return indisponivel
    if (item.saborIds.length > tamanho.max_sabores) return invalido('Pizza com sabores demais para o tamanho.')

    let soma = 0
    for (const saborId of item.saborIds) {
      const sp = sabores.get(saborId)?.sabor_preco.find((p) => p.tamanho_id === item.tamanhoId)
      if (!sp) return indisponivel
      soma += Number(precoVigente(sp))
    }
    precos.push(centavos(soma / item.saborIds.length + Number(borda.preco_extra)))
  }

  return { ok: true, precos }
}
