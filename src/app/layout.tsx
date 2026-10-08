import type { Metadata } from 'next'
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google'
import Providers from '@/components/Providers'
import Assinatura from '@/components/Assinatura'
import { supabase } from '@/lib/supabase'
import type { Config } from '@/types/pizzaria'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Aurelia's Pizzaria | Tradição & Sabor",
  description: 'Cardápio online, pizzas artesanais com massa fresca e ingredientes selecionados.',
}

// A config (loja aberta, frete grátis, desconto) precisa estar fresca em toda
// rota — inclusive /checkout aberto direto, sem passar pela home.
export const dynamic = 'force-dynamic'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: config } = await supabase.from('config_loja').select('*').eq('id', 1).single()

  return (
    <html lang="pt-BR" className={`${playfair.variable} ${jakarta.variable}`}>
      <body className="bg-[#0D1410] text-[#E0E8DF] min-h-screen selection:bg-[#3A5630] selection:text-white antialiased font-sans">
        <Providers config={(config as Config | null) ?? undefined}>{children}</Providers>
        <Assinatura />
      </body>
    </html>
  )
}