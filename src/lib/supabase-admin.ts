import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/**
 * Cliente com a service_role key — ignora RLS. Só pode ser usado em código
 * server-only (route handlers). Nunca importar de um componente 'use client'.
 * Retorna null se SUPABASE_SERVICE_ROLE_KEY ainda não estiver configurada
 * (evita instanciar em tempo de build e permite um erro amigável em runtime).
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  client ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  return client
}
