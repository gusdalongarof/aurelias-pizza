import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const { rua, numero, bairro } = await request.json()

  if (!rua?.trim() || !numero?.trim() || !bairro?.trim()) {
    return NextResponse.json({ error: 'Preencha rua, número e bairro.' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Cálculo de frete indisponível no momento. Fale com a loja pelo WhatsApp.' },
      { status: 500 }
    )
  }

  const { data: config, error: configError } = await supabase
    .from('config_loja')
    .select('endereco_loja, taxa_entrega_por_km')
    .eq('id', 1)
    .single()

  if (configError || !config?.endereco_loja || !config.taxa_entrega_por_km) {
    return NextResponse.json(
      { error: 'Cálculo de frete ainda não configurado pela loja.' },
      { status: 500 }
    )
  }

  const destino = `${rua.trim()}, ${numero.trim()} - ${bairro.trim()}, Santa Rosa - RS, Brasil`

  const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
  url.searchParams.set('origins', config.endereco_loja)
  url.searchParams.set('destinations', destino)
  url.searchParams.set('units', 'metric')
  url.searchParams.set('key', apiKey)

  const resp = await fetch(url.toString())
  const json = await resp.json()
  const elemento = json?.rows?.[0]?.elements?.[0]

  if (json.status !== 'OK' || !elemento || elemento.status !== 'OK') {
    return NextResponse.json(
      { error: 'Não conseguimos calcular a distância para esse endereço. Confira rua, número e bairro.' },
      { status: 422 }
    )
  }

  const distanciaKm = elemento.distance.value / 1000
  const taxaEntrega = Math.round(distanciaKm * config.taxa_entrega_por_km * 100) / 100

  return NextResponse.json({ distanciaKm, taxaEntrega })
}
