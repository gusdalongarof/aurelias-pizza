import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Cliente com a sessão do usuário logado (lida via cookies). Usar em Server
 * Components e route handlers do painel — respeita RLS pela sessão, não
 * pela service_role.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // chamado de um Server Component sem permissão de escrita —
            // o middleware já cuida de renovar a sessão nesse caso.
          }
        },
      },
    }
  )
}
