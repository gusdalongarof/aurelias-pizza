import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { validarSabor } from '@/lib/sabor-form'

// Cria um sabor novo pelo painel. Client da sessão (RLS: policies painel_cria_*).
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const v = validarSabor(await request.json())
  if ('erro' in v) {
    return NextResponse.json({ error: v.erro }, { status: 400 })
  }
  const { precos, ativo, ...campos } = v.sabor

  const { data: tamanhos } = await supabase.from('tamanhos').select('id')
  const faltando = (tamanhos ?? []).some((t) => !precos.some((p) => p.tamanhoId === t.id))
  if (!tamanhos?.length || faltando) {
    return NextResponse.json({ error: 'Informe o preço de todos os tamanhos.' }, { status: 400 })
  }

  // Entra desativado e só aparece no cardápio depois que os preços foram
  // gravados — se algo falhar no meio, não fica sabor sem preço no site.
  const { data: sabor, error } = await supabase
    .from('sabores')
    .insert({ ...campos, ativo: false })
    .select('id')
    .single()
  if (error || !sabor) {
    return NextResponse.json({ error: 'Não foi possível criar o sabor.' }, { status: 500 })
  }

  const { error: precoError } = await supabase
    .from('sabor_preco')
    .insert(precos.map((p) => ({ sabor_id: sabor.id, tamanho_id: p.tamanhoId, preco: p.preco })))
  if (precoError) {
    return NextResponse.json(
      { error: 'O sabor foi criado, mas os preços não foram gravados. Ele ficou fora do cardápio.' },
      { status: 500 }
    )
  }

  if (ativo) {
    await supabase.from('sabores').update({ ativo: true }).eq('id', sabor.id)
  }

  const { data } = await supabase
    .from('sabores')
    .select('id, nome, descricao, categoria, ativo, sabor_preco(tamanho_id, preco, preco_promo)')
    .eq('id', sabor.id)
    .single()

  return NextResponse.json(data)
}
