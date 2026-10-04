import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    const cookieStore = await cookies()

    const superEmail = process.env.SUPERADMIN_EMAIL || 'admin@barberadmin.com'
    const superPass = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin2025!'

    if (email === superEmail && password === superPass) {
      cookieStore.set('session_role', 'superadmin', { httpOnly: true, path: '/' })
      return NextResponse.json({ success: true, role: 'superadmin', redirect: '/superadmin' })
    }

    const supabase = createAdminClient()
    const { data: barberia, error } = await supabase
      .from('barberias')
      .select('id, nombre, slug, activa, password')
      .eq('email', email)
      .single()

    if (error || !barberia) return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    if (!barberia.activa) return NextResponse.json({ error: 'Cuenta suspendida' }, { status: 403 })
    if (barberia.password !== password) return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })

    cookieStore.set('session_role', 'barberia', { httpOnly: true, path: '/' })
    cookieStore.set('session_barberia_id', barberia.id, { httpOnly: true, path: '/' })

    return NextResponse.json({ success: true, role: 'barberia', redirect: '/admin' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}