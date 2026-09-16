'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function LoginPainel() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    setCarregando(true)

    const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password: senha })

    if (error) {
      setErro('E-mail ou senha inválidos.')
      setCarregando(false)
      return
    }

    router.push('/painel')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm form-section space-y-5">
        <h1
          className="text-xl font-bold text-[#D0D8D0]"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Painel do dono
        </h1>

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
        <div>
          <label className="block text-xs text-[#4D6150] mb-1">Senha</label>
          <input
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="campo"
          />
        </div>

        <button type="submit" disabled={carregando} className="btn-primary disabled:opacity-50">
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
