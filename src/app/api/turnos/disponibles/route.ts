import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { addMinutes, format, parse } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const barberiaId = searchParams.get('barberia_id')
    const barberoId = searchParams.get('barbero_id')
    const fecha = searchParams.get('fecha') // yyyy-MM-dd

    if (!barberiaId || !barberoId || !fecha) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Datos de la barbería
    const { data: barberia, error: errB } = await supabase
      .from('barberias')
      .select('horario_apertura, horario_cierre, intervalo_turnos')
      .eq('id', barberiaId)
      .single()

    if (errB || !barberia) {
      return NextResponse.json({ error: 'Barbería no encontrada' }, { status: 404 })
    }

    // 2. Turnos ya reservados
    const { data: turnosOcupados } = await supabase
      .from('turnos')
      .select('hora_inicio')
      .eq('barbero_id', barberoId)
      .eq('fecha', fecha)
      .eq('estado', 'reservado')

    const ocupadosSet = new Set((turnosOcupados || []).map((t: any) => t.hora_inicio.slice(0, 5)))

    // 3. CÁLCULO MATEMÁTICO EXACTO ARGENTINA (UTC - 3 HORAS)
    const nowUtcMs = Date.now()
    const argMs = nowUtcMs - (3 * 60 * 60 * 1000) // Restar exactamente 3 horas a UTC
    const argDate = new Date(argMs)

    const hoyArgentina = argDate.toISOString().slice(0, 10) // "2026-10-04"
    const horaArgentina = argDate.toISOString().slice(11, 16) // "14:52"

    // 4. Generación de bloques desde apertura hasta cierre
    const slots: string[] = []
    const intervalo = barberia.intervalo_turnos || 30
    const strApertura = (barberia.horario_apertura || '09:00:00').slice(0, 5)
    const strCierre = (barberia.horario_cierre || '20:00:00').slice(0, 5)

    let inicioDate = parse(strApertura, 'HH:mm', new Date())
    const cierreDate = parse(strCierre, 'HH:mm', new Date())

    while (inicioDate < cierreDate) {
      const horaStr = format(inicioDate, 'HH:mm')
      const estaLibre = !ocupadosSet.has(horaStr)

      let esFuturo = true
      if (fecha < hoyArgentina) {
        esFuturo = false
      } else if (fecha === hoyArgentina) {
        // Comparación limpia HH:mm (ej: "15:00" > "14:52" es TRUE)
        esFuturo = horaStr > horaArgentina
      }

      if (estaLibre && esFuturo) {
        slots.push(horaStr)
      }

      inicioDate = addMinutes(inicioDate, intervalo)
    }

    return NextResponse.json({ slots, hoyArgentina, horaArgentina })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}