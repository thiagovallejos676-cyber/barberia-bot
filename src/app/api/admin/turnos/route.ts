import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getBarberiaIdActual } from '@/lib/session-helper'

export async function PUT(req: NextRequest) {
  const barberiaId = await getBarberiaIdActual()
  if (!barberiaId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id, estado } = await req.json()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('turnos')
    .update({ estado })
    .eq('id', id)
    .eq('barberia_id', barberiaId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}