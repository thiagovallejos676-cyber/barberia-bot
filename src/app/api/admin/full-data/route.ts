import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getBarberiaIdActual } from '@/lib/session-helper'
import { format } from 'date-fns'

export async function GET() {
  try {
    const barberiaId = await getBarberiaIdActual()
    if (!barberiaId) {
      return NextResponse.json({ error: 'No hay ninguna barbería activa' }, { status: 404 })
    }

    const supabase = createAdminClient()
    const hoy = format(new Date(), 'yyyy-MM-dd')

    // Consultar cada tabla de forma limpia sin depender de joins automaticos
    const [
      { data: barberia },
      { data: barberos },
      { data: servicios },
      { data: rawTurnos },
      { data: clientes }
    ] = await Promise.all([
      supabase.from('barberias').select('*').eq('id', barberiaId).single(),
      supabase.from('barberos').select('*').eq('barberia_id', barberiaId).order('created_at', { ascending: false }),
      supabase.from('servicios').select('*').eq('barberia_id', barberiaId).order('created_at', { ascending: false }),
      supabase.from('turnos').select('*').eq('barberia_id', barberiaId).order('fecha', { ascending: true }).order('hora_inicio', { ascending: true }),
      supabase.from('clientes').select('*')
    ])

    // Crear mapas de busqueda rapida en JS
    const clienteMap = new Map((clientes || []).map(c => [c.id, c]))
    const barberoMap = new Map((barberos || []).map(b => [b.id, b]))
    const servicioMap = new Map((servicios || []).map(s => [s.id, s]))

    // Mapear y enriquecer los turnos garantizando que NUNCA fallen los datos
    const turnosEnriquecidos = (rawTurnos || []).map((t: any) => ({
      ...t,
      clientes: clienteMap.get(t.cliente_id) || { nombre: 'Cliente', telefono: 'Sin número' },
      barberos: barberoMap.get(t.barbero_id) || { nombre: 'Barbero' },
      servicios: servicioMap.get(t.servicio_id) || { nombre: 'Servicio', precio: 0 }
    }))

    const turnosHoy = turnosEnriquecidos.filter(t => t.fecha === hoy && t.estado === 'reservado').length
    const canceladosHoy = turnosEnriquecidos.filter(t => t.fecha === hoy && t.estado === 'cancelado').length

    return NextResponse.json({
      barberia,
      barberos: barberos || [],
      servicios: servicios || [],
      turnos: turnosEnriquecidos,
      stats: {
        turnosHoy,
        canceladosHoy,
        totalBarberos: (barberos || []).filter((b: any) => b.activo).length,
        totalServicios: (servicios || []).filter((s: any) => s.activo).length
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}