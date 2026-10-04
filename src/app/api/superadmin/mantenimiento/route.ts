import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { subDays, format } from 'date-fns'

export async function POST(req: NextRequest) {
  try {
    const { tipo } = await req.json()
    const supabase = createAdminClient()
    const hoy = new Date()

    if (tipo === 'limpiar_viejos') {
      // Borrar turnos completados o cancelados de hace mas de 90 dias
      const fechaLimite = format(subDays(hoy, 90), 'yyyy-MM-dd')
      const { count, error } = await supabase
        .from('turnos')
        .delete({ count: 'exact' })
        .lt('fecha', fechaLimite)
        .in('estado', ['completado', 'cancelado'])

      if (error) throw error
      return NextResponse.json({ success: true, mensaje: `Se borraron ${count} registros antiguos.` })
    }

    if (tipo === 'limpiar_logs') {
      // Borrar logs de notificaciones de hace mas de 30 dias
      const { count, error } = await supabase
        .from('notificaciones_log')
        .delete({ count: 'exact' })
        .lt('enviado_at', subDays(hoy, 30).toISOString())

      if (error) throw error
      return NextResponse.json({ success: true, mensaje: `Se borraron ${count} logs de mensajes.` })
    }

    return NextResponse.json({ error: 'Tipo de mantenimiento no válido' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}