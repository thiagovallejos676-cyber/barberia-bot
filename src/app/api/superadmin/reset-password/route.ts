import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const { barberia_id, new_password } = await req.json()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('barberias')
    .update({ password: new_password })
    .eq('id', barberia_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}