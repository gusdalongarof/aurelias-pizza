'use client'

import { usePathname } from 'next/navigation'

// Rodapé com a assinatura do desenvolvedor nas páginas do cliente. Fica no
// root layout; o painel do dono não mostra.
export default function Assinatura() {
  const pathname = usePathname()
  if (pathname.startsWith('/painel')) return null

  // Na home a barra flutuante do carrinho fica por cima do fim da página.
  const espacoCarrinho = pathname === '/' ? 'pb-28' : 'pb-8'

  return (
    <footer className={`border-t border-[#1A2318] bg-[#0D1410] px-4 pt-6 ${espacoCarrinho} text-center text-[11px] text-[#4D6150]`}>
      Desenvolvido por <span className="font-semibold text-[#8AA087]">Gustavo</span>
      {' · '}
      <a
        href="https://www.instagram.com/gusd_fraga/"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-[#8AA087] hover:text-[#C9A24F] transition-colors"
      >
        @gusd_fraga
      </a>
    </footer>
  )
}
