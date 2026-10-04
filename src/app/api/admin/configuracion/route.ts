import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getBarberiaIdActual } from '@/lib/session-helper'

export async function GET() {
  const barberiaId = await getBarberiaIdActual()
  if (!barberiaId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('barberias').select('*').eq('id', barberiaId).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ barberia: data })
}

export async function PUT(req: NextRequest) {
  const barberiaId = await getBarberiaIdActual()
  if (!barberiaId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const supabase = createAdminClient()

  let hApertura = body.horario_apertura || '09:00'
  let hCierre = body.horario_cierre || '20:00'

  if (hApertura.length === 5) hApertura += ':00'
  if (hCierre.length === 5) hCierre += ':00'

  const { data, error } = await supabase
    .from('barberias')
    .update({
      nombre: body.nombre,
      direccion: body.direccion,
      telefono: body.telefono,
      horario_apertura: hApertura,
      horario_cierre: hCierre,
      intervalo_turnos: Number(body.intervalo_turnos) || 30
    })
    .eq('id', barberiaId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, barberia: data })
}