// Validação do sabor enviado pelo painel (/painel/cardapio), usada por
// POST /api/sabores e PATCH /api/sabores/[id].

export type SaborEntrada = {
  nome: string
  descricao: string | null
  categoria: 'salgada' | 'doce'
  ativo: boolean
  precos: { tamanhoId: number; preco: number }[]
}

export function validarSabor(body: unknown): { sabor: SaborEntrada } | { erro: string } {
  const b = (body ?? {}) as Record<string, unknown>

  const nome = typeof b.nome === 'string' ? b.nome.trim() : ''
  if (!nome || nome.length > 80) return { erro: 'Informe o nome do sabor.' }

  const descricao = typeof b.descricao === 'string' ? b.descricao.trim() : ''
  if (descricao.length > 300) return { erro: 'Descrição muito longa (máx. 300 caracteres).' }

  if (b.categoria !== 'salgada' && b.categoria !== 'doce') return { erro: 'Categoria inválida.' }

  if (typeof b.ativo !== 'boolean') return { erro: 'Informe se o sabor está no cardápio.' }

  if (!Array.isArray(b.precos) || b.precos.length === 0) return { erro: 'Informe os preços.' }
  const precos: SaborEntrada['precos'] = []
  for (const p of b.precos as Record<string, unknown>[]) {
    const tamanhoId = p?.tamanhoId
    const preco = p?.preco
    if (!Number.isInteger(tamanhoId)) return { erro: 'Tamanho inválido.' }
    if (typeof preco !== 'number' || !Number.isFinite(preco) || preco <= 0 || preco > 1000) {
      return { erro: 'Informe um preço válido para todos os tamanhos.' }
    }
    precos.push({ tamanhoId: tamanhoId as number, preco: Math.round(preco * 100) / 100 })
  }

  return {
    sabor: { nome, descricao: descricao || null, categoria: b.categoria, ativo: b.ativo, precos },
  }
}
