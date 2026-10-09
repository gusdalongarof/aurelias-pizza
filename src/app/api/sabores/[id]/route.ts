import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { validarSabor } from '@/lib/sabor-form'

// Edita um sabor pelo painel. Grant por coluna: `authenticated` só altera
// nome/descricao/categoria/ativo em sabores e preco/preco_promo em sabor_preco.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id)
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Sabor inválido.' }, { status: 400 })
  }

  const v = validarSabor(await request.json())
  if ('erro' in v) {
    return NextResponse.json({ error: v.erro }, { status: 400 })
  }
  const { precos, ...campos } = v.sabor

  const { data: atualizado, error } = await supabase
    .from('sabores')
    .update(campos)
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (error) {
    return NextResponse.json({ error: 'Não foi possível salvar o sabor.' }, { status: 500 })
  }
  if (!atualizado) {
    return NextResponse.json({ error: 'Sabor não encontrado.' }, { status: 404 })
  }

  for (const p of precos) {
    const { error: precoError } = await supabase
      .from('sabor_preco')
      .update({ preco: p.preco })
      .eq('sabor_id', id)
      .eq('tamanho_id', p.tamanhoId)
    if (precoError?.code === '23514') {
      return NextResponse.json(
        {
          error:
            'O preço ficou menor ou igual ao preço promocional. Remova a promoção em Promoções antes de baixar o preço.',
        },
        { status: 400 }
      )
    }
    if (precoError) {
      return NextResponse.json({ error: 'Não foi possível salvar o preço.' }, { status: 500 })
    }
  }

  const { data } = await supabase
    .from('sabores')
    .select('id, nome, descricao, categoria, ativo, sabor_preco(tamanho_id, preco, preco_promo)')
    .eq('id', id)
    .single()

  return NextResponse.json(data)
}
