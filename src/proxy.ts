import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  // Páginas para quem ainda não entrou. /painel/nova-senha não está aqui:
  // exige a sessão criada pelo link de recuperação (/auth/confirm).
  const isPaginaPublica = pathname === '/painel/login' || pathname === '/painel/esqueci-senha'

  if (!user && !isPaginaPublica) {
    return NextResponse.redirect(new URL('/painel/login', request.url))
  }

  if (user && isPaginaPublica) {
    return NextResponse.redirect(new URL('/painel', request.url))
  }

  return response
}

export const config = {
  matcher: ['/painel/:path*'],
}
