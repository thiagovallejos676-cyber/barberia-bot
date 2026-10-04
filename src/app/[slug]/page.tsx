import { createAdminClient } from '@/lib/supabase-admin'
import BookingWizard from '@/components/booking/BookingWizard'
import { redirect } from 'next/navigation'

export const revalidate = 0

export default async function PublicBarberiaPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // Si el usuario escribe una ruta interna en la URL, redirigir a donde corresponde
  const slugLower = slug.toLowerCase()
  if (slugLower === 'admin') redirect('/admin')
  if (slugLower === 'superadmin') redirect('/superadmin')
  if (slugLower === 'login') redirect('/login')

  const supabase = createAdminClient()

  let { data: barberia } = await supabase
    .from('barberias')
    .select(`
      *,
      barberos(*),
      servicios(*)
    `)
    .eq('slug', slugLower)
    .single()

  if (!barberia) {
    return (
      <div className="min-h-screen bg-[#0a0a0e] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center text-3xl font-bold">
          💈
        </div>
        <h1 className="text-2xl font-black">Barbería "{slug}" no encontrada</h1>
        <p className="text-xs text-neutral-400">Verificá la URL o creala desde el SuperAdmin.</p>
        <a href="/superadmin" className="text-xs text-amber-400 underline font-bold">
          Ir al SuperAdmin →
        </a>
      </div>
    )
  }

  // Auto-sembrado si la barbería recién creada está vacía
  if (!barberia.servicios || barberia.servicios.length === 0) {
    const { data: nuevosServicios } = await supabase
      .from('servicios')
      .insert([
        { barberia_id: barberia.id, nombre: 'Corte de Pelo Clásico', duracion: 30, precio: 5000, activo: true },
        { barberia_id: barberia.id, nombre: 'Corte + Barba Premium', duracion: 45, precio: 7500, activo: true }
      ])
      .select()
    barberia.servicios = nuevosServicios || []
  }

  if (!barberia.barberos || barberia.barberos.length === 0) {
    const { data: nuevosBarberos } = await supabase
      .from('barberos')
      .insert([{ barberia_id: barberia.id, nombre: 'Barbero Principal', activo: true }])
      .select()
    barberia.barberos = nuevosBarberos || []
  }

  return (
    <div className="min-h-screen bg-[#0a0a0e] text-white pb-16">
      <header className="border-b border-neutral-800 bg-neutral-900/50 py-8 px-4 text-center">
        <div className="max-w-md mx-auto space-y-2">
          <div className="w-14 h-14 bg-amber-500 text-neutral-950 font-black rounded-2xl mx-auto flex items-center justify-center text-2xl shadow-lg shadow-amber-500/20">
            ✂️
          </div>
          <h1 className="text-2xl font-black text-white uppercase italic">{barberia.nombre}</h1>
          <p className="text-xs text-neutral-400">{barberia.direccion || 'Reserva de turnos online'}</p>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-6">
        <div className="bg-[#13131a] border border-[#232330] rounded-3xl p-6 shadow-2xl">
          <BookingWizard
            barberia={barberia}
            barberos={barberia.barberos.filter((b: any) => b.activo)}
            servicios={barberia.servicios.filter((s: any) => s.activo)}
          />
        </div>
      </main>
    </div>
  )
}