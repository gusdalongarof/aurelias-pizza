import type { Metadata } from 'next'
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google'
import Providers from '@/components/Providers'
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${playfair.variable} ${jakarta.variable}`}>
      <body className="bg-[#0D1410] text-[#E0E8DF] min-h-screen selection:bg-[#3A5630] selection:text-white antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}