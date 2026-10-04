import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token inválido' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: turno } = await supabase
    .from('turnos')
    .select('*, barberias(nombre), barberos(nombre), servicios(nombre)')
    .eq('token_cancelacion', token)
    .eq('estado', 'reservado')
    .single()

  if (!turno) return NextResponse.json({ error: 'El turno no existe o ya fue cancelado' }, { status: 404 })

  return NextResponse.json({ turno })
}

export async function POST(req: NextRequest) {
  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: turno } = await supabase
    .from('turnos')
    .select('id, estado')
    .eq('token_cancelacion', token)
    .single()

  if (!turno || turno.estado !== 'reservado') {
    return NextResponse.json({ error: 'El turno no se puede cancelar' }, { status: 400 })
  }

  const { error } = await supabase
    .from('turnos')
    .update({ estado: 'cancelado' })
    .eq('id', turno.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}