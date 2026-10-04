import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { addMinutes, format, parse, isAfter } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const barberiaId = searchParams.get('barberia_id')
    const barberoId = searchParams.get('barbero_id')
    const fecha = searchParams.get('fecha')

    if (!barberiaId || !barberoId || !fecha) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Datos del local
    const { data: barberia, error: errB } = await supabase
      .from('barberias')
      .select('horario_apertura, horario_cierre, intervalo_turnos')
      .eq('id', barberiaId)
      .single()

    if (errB || !barberia) {
      return NextResponse.json({ error: 'Barbería no encontrada' }, { status: 404 })
    }

    // 2. Turnos reservados
    const { data: turnosOcupados } = await supabase
      .from('turnos')
      .select('hora_inicio')
      .eq('barbero_id', barberoId)
      .eq('fecha', fecha)
      .eq('estado', 'reservado')

    const ocupadosSet = new Set((turnosOcupados || []).map((t: any) => t.hora_inicio.slice(0, 5)))

    // 3. Generación dinámica de bloques
    const slots: string[] = []
    const intervalo = barberia.intervalo_turnos || 30
    const strApertura = (barberia.horario_apertura || '09:00:00').slice(0, 5)
    const strCierre = (barberia.horario_cierre || '20:00:00').slice(0, 5)

    let inicioDate = parse(strApertura, 'HH:mm', new Date())
    const cierreDate = parse(strCierre, 'HH:mm', new Date())
    const hoyStr = format(new Date(), 'yyyy-MM-dd')
    const ahora = new Date()

    while (inicioDate < cierreDate) {
      const horaStr = format(inicioDate, 'HH:mm')
      const estaLibre = !ocupadosSet.has(horaStr)

      let esFuturo = true
      if (fecha === hoyStr) {
        const slotDate = parse(`${fecha} ${horaStr}`, 'yyyy-MM-dd HH:mm', new Date())
        esFuturo = isAfter(slotDate, ahora)
      }

      if (estaLibre && esFuturo) {
        slots.push(horaStr)
      }

      inicioDate = addMinutes(inicioDate, intervalo)
    }

    return NextResponse.json({ slots, apertura: strApertura, cierre: strCierre, intervalo })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}