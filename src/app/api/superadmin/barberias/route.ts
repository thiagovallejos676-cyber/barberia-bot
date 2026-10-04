import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('barberias')
      .select('*, barberos(count), servicios(count), turnos(count)')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ barberias: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await req.json()

    if (!body.nombre || !body.email || !body.password) {
      return NextResponse.json({ error: 'Nombre, Email y Contraseña son obligatorios.' }, { status: 400 })
    }

    let slug = body.slug || body.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    if (!slug) slug = 'barberia-' + Date.now()

    const { data, error } = await supabase
      .from('barberias')
      .insert({
        nombre: body.nombre,
        slug: slug,
        email: body.email.toLowerCase().trim(),
        password: body.password,
        direccion: body.direccion || null,
        telefono: body.telefono || null,
        activa: true
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ya existe un local con ese Slug o Email. Ingresá otro.' }, { status: 400 })
      }
      throw error
    }

    return NextResponse.json({ success: true, barberia: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID de barbería requerido' }, { status: 400 })

    // Borrado manual en cascada para evitar errores de clave foránea (23503)
    await supabase.from('turnos').delete().eq('barberia_id', id)
    await supabase.from('barberos').delete().eq('barberia_id', id)
    await supabase.from('servicios').delete().eq('barberia_id', id)

    const { error } = await supabase.from('barberias').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true, message: 'Barbería eliminada correctamente.' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}