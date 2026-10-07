import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase-server'

/**
 * Destino do link de "Esqueci minha senha". Troca o código do e-mail por uma
 * sessão (cookie) e manda para /painel/nova-senha.
 *
 * Aceita os dois formatos de link do Supabase:
 * - `?code=` (PKCE, template padrão) — só funciona no mesmo navegador em que
 *   o link foi pedido, porque o verificador fica num cookie dele;
 * - `?token_hash=&type=recovery` (template de e-mail personalizado) —
 *   funciona em qualquer aparelho.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const nextParam = searchParams.get('next') ?? '/painel/nova-senha'
  // Só redireciona para dentro do painel — evita open redirect pelo `next`.
  const next = nextParam.startsWith('/painel/') ? nextParam : '/painel/nova-senha'

  const supabase = await createSupabaseServerClient()

  let ok = false
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    ok = !error
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    ok = !error
  }

  return NextResponse.redirect(new URL(ok ? next : '/painel/esqueci-senha?erro=link', origin))
}
