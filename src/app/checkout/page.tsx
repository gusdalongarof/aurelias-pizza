import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import CheckoutForm from '@/components/CheckoutForm'
import LojaFechadaAviso, { LojaFechadaCartao } from '@/components/LojaFechadaAviso'
import type { Bairro } from '@/types/pizzaria'

export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  const [{ data: bairros }, { data: config }] = await Promise.all([
    supabase.from('bairros').select('id, nome, taxa_entrega, tempo_entrega_min').order('nome'),
    supabase.from('config_loja').select('aberta').eq('id', 1).single(),
  ])

  if (config && !config.aberta) {
    return (
      <main className="min-h-screen bg-[#0D1410] px-4 sm:px-6 py-8 text-[#E0E8DF]">
        <div className="mx-auto max-w-md">
          <Link href="/" className="text-xs text-[#4D6150] hover:text-[#8AA087] transition-colors">
            ← Voltar ao cardápio
          </Link>
          <div className="mt-8">
            <LojaFechadaCartao />
          </div>
        </div>
        <LojaFechadaAviso />
      </main>
    )
  }

  return <CheckoutForm bairros={(bairros ?? []) as Bairro[]} />
}
