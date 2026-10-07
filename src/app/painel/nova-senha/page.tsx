'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

const MIN_SENHA = 8

// Chega aqui logado pela sessão de recuperação (/auth/confirm). O proxy já
// manda quem não tem sessão para /painel/login.
export default function NovaSenhaPage() {
  const router = useRouter()
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)

    if (senha.length < MIN_SENHA) {
      setErro(`A senha precisa ter pelo menos ${MIN_SENHA} caracteres.`)
      return
    }
    if (senha !== confirmacao) {
      setErro('As duas senhas não são iguais.')
      return
    }

    setCarregando(true)
    const { error } = await supabaseBrowser.auth.updateUser({ password: senha })
    setCarregando(false)

    if (error) {
      setErro(
        error.code === 'same_password'
          ? 'A senha nova precisa ser diferente da atual.'
          : error.code === 'weak_password'
            ? 'Senha fraca. Use uma senha mais longa, misturando letras e números.'
            : 'Não foi possível trocar a senha. Peça um novo link e tente de novo.'
      )
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
          Criar senha nova
        </h1>

        {erro && (
          <div className="rounded-xl bg-[#281A1A] border border-[#4A2525] px-4 py-3 text-sm text-[#C47070]">
            {erro}
          </div>
        )}

        <div>
          <label className="block text-xs text-[#4D6150] mb-1">Senha nova</label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="campo"
            autoFocus
          />
          <p className="mt-1 text-[11px] text-[#4D6150]">Pelo menos {MIN_SENHA} caracteres.</p>
        </div>
        <div>
          <label className="block text-xs text-[#4D6150] mb-1">Repita a senha nova</label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            className="campo"
          />
        </div>

        <button type="submit" disabled={carregando} className="btn-primary disabled:opacity-50">
          {carregando ? 'Salvando...' : 'Salvar senha e entrar'}
        </button>
      </form>
    </main>
  )
}
