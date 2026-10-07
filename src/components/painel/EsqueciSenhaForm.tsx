'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function EsqueciSenhaForm({ linkInvalido }: { linkInvalido: boolean }) {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState<string | null>(
    linkInvalido ? 'O link de recuperação expirou ou já foi usado. Peça um novo abaixo.' : null
  )
  const [carregando, setCarregando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    setCarregando(true)

    const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm?next=/painel/nova-senha`,
    })

    setCarregando(false)
    // Erro de e-mail não cadastrado não é exposto pelo Supabase; o que sobra
    // aqui é limite de envios ou falha de rede.
    if (error) {
      setErro(
        error.status === 429
          ? 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
          : 'Não foi possível enviar o e-mail. Tente novamente.'
      )
      return
    }
    setEnviado(true)
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm form-section space-y-5">
        <h1
          className="text-xl font-bold text-[#D0D8D0]"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Esqueci minha senha
        </h1>

        {enviado ? (
          <p className="text-sm leading-relaxed text-[#A2B5A0]">
            Se <strong className="text-[#D0D8D0]">{email.trim()}</strong> tiver conta no painel, enviamos
            um link para criar uma senha nova. Confira a caixa de entrada e o spam. Abra o link
            <strong className="text-[#D0D8D0]"> neste mesmo navegador</strong>.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-sm text-[#7A8C78]">
              Informe o e-mail da sua conta. Vamos mandar um link para você criar uma senha nova.
            </p>

            {erro && (
              <div className="rounded-xl bg-[#281A1A] border border-[#4A2525] px-4 py-3 text-sm text-[#C47070]">
                {erro}
              </div>
            )}

            <div>
              <label className="block text-xs text-[#4D6150] mb-1">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="campo"
                autoFocus
              />
            </div>

            <button type="submit" disabled={carregando} className="btn-primary disabled:opacity-50">
              {carregando ? 'Enviando...' : 'Enviar link'}
            </button>
          </form>
        )}

        <Link href="/painel/login" className="block text-center text-xs text-[#4D6150] hover:text-[#8AA087]">
          ← Voltar ao login
        </Link>
      </div>
    </main>
  )
}
