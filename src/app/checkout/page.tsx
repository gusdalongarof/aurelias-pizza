import { supabase } from '@/lib/supabase'
import CheckoutForm from '@/components/CheckoutForm'
import type { Bairro } from '@/types/pizzaria'

export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  const { data: bairros } = await supabase
    .from('bairros')
    .select('id, nome, taxa_entrega, tempo_entrega_min')
    .order('nome')

  return <CheckoutForm bairros={(bairros ?? []) as Bairro[]} />
}
