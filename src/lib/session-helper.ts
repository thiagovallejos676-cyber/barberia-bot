import { createAdminClient } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'

export async function getBarberiaIdActual() {
  try {
    const cookieStore = await cookies()
    const cookieId = cookieStore.get('session_barberia_id')?.value
    if (cookieId) return cookieId

    const supabase = createAdminClient()
    const { data } = await supabase
      .from('barberias')
      .select('id')
      .eq('activa', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return data?.id || null
  } catch {
    return null
  }
}