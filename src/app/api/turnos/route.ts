import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { addMinutes, format, parse } from 'date-fns'

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await req.json()

    const {
      barberia_id,
      barbero_id,
      servicio_id,
      fecha,
      hora_inicio,
      cliente_nombre,
      cliente_telefono
    } = body

    if (!barberia_id || !barbero_id || !servicio_id || !fecha || !hora_inicio || !cliente_nombre || !cliente_telefono) {
      return NextResponse.json({ error: 'Completá todos los datos para la reserva' }, { status: 400 })
    }

    const telLimpio = cliente_telefono.trim()

    // 1. Buscar cliente por telefono con maybeSingle para evitar excepciones
    let { data: cliente } = await supabase
      .from('clientes')
      .select('id')
      .eq('telefono', telLimpio)
      .maybeSingle()

    // Si no existe, crearlo
    if (!cliente) {
      const { data: nuevoCliente, error: errC } = await supabase
        .from('clientes')
        .insert({ nombre: cliente_nombre.trim(), telefono: telLimpio })
        .select('id')
        .single()

      if (errC) {
        // Fallback en caso de duplicado simultaneo
        const { data: cExist } = await supabase.from('clientes').select('id').eq('telefono', telLimpio).single()
        cliente = cExist
      } else {
        cliente = nuevoCliente
      }
    }

    if (!cliente) {
      return NextResponse.json({ error: 'Error identificando al cliente' }, { status: 500 })
    }

    // 2. Obtener duracion del servicio
    const { data: servicio } = await supabase
      .from('servicios')
      .select('duracion')
      .eq('id', servicio_id)
      .single()

    const duracionMin = servicio?.duracion || 30
    const strHoraInicio = hora_inicio.length === 5 ? hora_inicio : hora_inicio.slice(0, 5)
    const inicioDate = parse(strHoraInicio, 'HH:mm', new Date())
    const finDate = addMinutes(inicioDate, duracionMin)
    const strHoraFin = format(finDate, 'HH:mm')

    // 3. Insertar el turno
    const { data: turno, error: errTurno } = await supabase
      .from('turnos')
      .insert({
        barberia_id,
        barbero_id,
        cliente_id: cliente.id,
        servicio_id,
        fecha,
        hora_inicio: strHoraInicio + ':00',
        hora_fin: strHoraFin + ':00',
        estado: 'reservado'
      })
      .select()
      .single()

    if (errTurno) {
      return NextResponse.json({ error: 'Error guardando el turno: ' + errTurno.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, turno })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}