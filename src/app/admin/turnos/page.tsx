'use client'
import { useEffect, useState } from 'react'
import { Calendar, CheckCircle, XCircle } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

export default function TurnosPage() {
  const [turnos, setTurnos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('hoy')

  useEffect(() => { cargarTurnos() }, [filtro])

  const cargarTurnos = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/turnos?filtro=${filtro}`)
      const data = await res.json()
      setTurnos(data.turnos || [])
    } catch {
      toast.error('Error cargando turnos')
    } finally {
      setLoading(false)
    }
  }

  const cambiarEstado = async (id: string, estado: string) => {
    const res = await fetch('/api/admin/turnos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, estado })
    })
    if (res.ok) {
      toast.success(estado === 'completado' ? 'Turno completado' : 'Turno cancelado')
      cargarTurnos()
    } else {
      toast.error('Error al actualizar')
    }
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">📅 Turnos</h1>
          <p className="text-neutral-400 text-sm">Agenda y gestión de reservas</p>
        </div>
        <div className="flex gap-2">
          {['hoy', 'proximos', 'todos'].map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                filtro === f ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {f === 'hoy' ? 'Hoy' : f === 'proximos' ? 'Próximos' : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-neutral-500">Cargando turnos...</div>
      ) : turnos.length === 0 ? (
        <div className="text-center py-16 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-500">
          <Calendar size={36} className="mx-auto mb-3 opacity-30" />
          No hay turnos en este filtro.
        </div>
      ) : (
        <div className="space-y-2">
          {turnos.map((t: any) => (
            <div key={t.id} className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="text-center min-w-[60px]">
                  <p className="font-mono font-black text-amber-400 text-lg">{t.hora_inicio?.slice(0,5)}</p>
                  <p className="text-[10px] text-neutral-500">{t.fecha}</p>
                </div>
                <div>
                  <p className="font-bold text-white">{t.clientes?.nombre}</p>
                  <p className="text-xs text-neutral-400">{t.servicios?.nombre} · {t.barberos?.nombre}</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">📱 {t.clientes?.telefono}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                  t.estado === 'reservado' ? 'bg-emerald-500/10 text-emerald-400' :
                  t.estado === 'cancelado' ? 'bg-red-500/10 text-red-400' :
                  'bg-blue-500/10 text-blue-400'
                }`}>
                  {t.estado}
                </span>
                {t.estado === 'reservado' && (
                  <>
                    <button
                      onClick={() => cambiarEstado(t.id, 'completado')}
                      className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      title="Marcar completado"
                    >
                      <CheckCircle size={16} />
                    </button>
                    <button
                      onClick={() => cambiarEstado(t.id, 'cancelado')}
                      className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      title="Cancelar turno"
                    >
                      <XCircle size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}