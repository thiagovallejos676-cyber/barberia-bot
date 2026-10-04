import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete('session_role')
  cookieStore.delete('session_barberia_id')
  return NextResponse.json({ success: true })
}