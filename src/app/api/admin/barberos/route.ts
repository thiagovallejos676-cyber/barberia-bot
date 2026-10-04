import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getBarberiaIdActual } from '@/lib/session-helper'

export async function GET() {
  const barberiaId = await getBarberiaIdActual()
  if (!barberiaId) return NextResponse.json({ error: 'No hay barbería activa' }, { status: 404 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('barberos')
    .select('*')
    .eq('barberia_id', barberiaId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ barberos: data || [] })
}

export async function POST(req: NextRequest) {
  const barberiaId = await getBarberiaIdActual()
  if (!barberiaId) return NextResponse.json({ error: 'No hay barbería activa' }, { status: 404 })

  const body = await req.json()
  if (!body.nombre) return NextResponse.json({ error: 'El nombre del barbero es requerido' }, { status: 400 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('barberos')
    .insert({
      barberia_id: barberiaId,
      nombre: body.nombre,
      telefono: body.telefono || null,
      activo: true
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, barbero: data })
}

export async function PUT(req: NextRequest) {
  const barberiaId = await getBarberiaIdActual()
  if (!barberiaId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { id, ...updates } = body
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('barberos')
    .update(updates)
    .eq('id', id)
    .eq('barberia_id', barberiaId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, barbero: data })
}

export async function DELETE(req: NextRequest) {
  const barberiaId = await getBarberiaIdActual()
  if (!barberiaId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const supabase = createAdminClient()
  const { error } = await supabase.from('barberos').delete().eq('id', id).eq('barberia_id', barberiaId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}