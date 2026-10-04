import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'
import { format } from 'date-fns'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const barberiaId = cookieStore.get('session_barberia_id')?.value
    const role = cookieStore.get('session_role')?.value

    if (!barberiaId || role !== 'barberia') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const hoy = format(new Date(), 'yyyy-MM-dd')

    const [
      { data: barberia },
      { count: turnosHoy },
      { count: cancelados },
      { count: barberos },
      { count: servicios },
      { data: listaTurnos }
    ] = await Promise.all([
      supabase.from('barberias').select('id, nombre, slug').eq('id', barberiaId).single(),
      supabase.from('turnos').select('*', { count: 'exact', head: true }).eq('barberia_id', barberiaId).eq('fecha', hoy).eq('estado', 'reservado'),
      supabase.from('turnos').select('*', { count: 'exact', head: true }).eq('barberia_id', barberiaId).eq('fecha', hoy).eq('estado', 'cancelado'),
      supabase.from('barberos').select('*', { count: 'exact', head: true }).eq('barberia_id', barberiaId).eq('activo', true),
      supabase.from('servicios').select('*', { count: 'exact', head: true }).eq('barberia_id', barberiaId).eq('activo', true),
      supabase.from('turnos')
        .select('id, hora_inicio, estado, clientes(nombre), barberos(nombre), servicios(nombre)')
        .eq('barberia_id', barberiaId)
        .eq('fecha', hoy)
        .order('hora_inicio')
        .limit(15)
    ])

    return NextResponse.json({
      barberia,
      stats: {
        turnosHoy: turnosHoy || 0,
        cancelados: cancelados || 0,
        barberos: barberos || 0,
        servicios: servicios || 0
      },
      turnosHoy: listaTurnos || []
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}