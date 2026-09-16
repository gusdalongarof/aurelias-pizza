import { createBrowserClient } from '@supabase/ssr'

/**
 * Cliente com a sessão do usuário logado, para uso em componentes
 * 'use client' do painel (login, logout, realtime).
 */
export const supabaseBrowser = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
