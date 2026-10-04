import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getBarberiaIdActual } from '@/lib/session-helper'

export async function GET() {
  try {
    const barberiaId = await getBarberiaIdActual()
    if (!barberiaId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const supabase = createAdminClient()
    const { data } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('barberia_id', barberiaId)
      .maybeSingle()

    return NextResponse.json({
      status: data?.status || 'DISCONNECTED',
      qr_code: data?.qr_code || null,
      phone: data?.phone || null
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST() {
  try {
    const barberiaId = await getBarberiaIdActual()
    if (!barberiaId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const supabase = createAdminClient()
    await supabase.from('whatsapp_sessions').upsert({
      barberia_id: barberiaId,
      status: 'INIT_REQUEST',
      qr_code: null,
      updated_at: new Date().toISOString()
    })

    return NextResponse.json({ success: true, message: 'Solicitando Código QR...' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const barberiaId = await getBarberiaIdActual()
    if (!barberiaId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const supabase = createAdminClient()
    await supabase.from('whatsapp_sessions').update({
      status: 'DISCONNECT_REQUEST',
      qr_code: null,
      phone: null,
      updated_at: new Date().toISOString()
    }).eq('barberia_id', barberiaId)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}