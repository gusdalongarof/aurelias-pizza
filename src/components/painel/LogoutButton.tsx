'use client'

import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await supabaseBrowser.auth.signOut()
    router.push('/painel/login')
    router.refresh()
  }

  return (
    <button type="button" onClick={handleLogout} className="btn-ghost">
      Sair
    </button>
  )
}
