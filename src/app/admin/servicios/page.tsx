'use client'
import { useState, useEffect } from 'react'
import { Plus, Scissors, Clock } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<any[]>([])
  const [openModal, setOpenModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const [form, setForm] = useState({
    nombre: '',
    duracion: 30,
    precio: 5000
  })

  useEffect(() => {
    cargarServicios()
  }, [])

  const cargarServicios = async () => {
    try {
      const res = await fetch('/api/admin/servicios')
      const data = await res.json()
      setServicios(data.servicios || [])
    } catch {
      toast.error('Error al cargar servicios')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre || !form.precio) {
      toast.error('Completá nombre y precio')
      return
    }

    setGuardando(true)
    try {
      const res = await fetch('/api/admin/servicios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('¡Servicio agregado al catálogo!')
        setOpenModal(false)
        setForm({ nombre: '', duracion: 30, precio: 5000 })
        cargarServicios()
      } else {
        toast.error(data.error || 'Error al guardar servicio')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setGuardando(false)
    }
  }

  const toggleEstado = async (id: string, activo: boolean) => {
    await fetch('/api/admin/servicios', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, activo: !activo })
    })
    cargarServicios()
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Scissors size={24} className="text-amber-500" /> Catálogo de Servicios
          </h1>
          <p className="text-neutral-400 text-sm mt-1">Configurá los cortes, precios y tiempos de atención</p>
        </div>
        <button
          onClick={() => setOpenModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-black text-sm hover:opacity-95 transition shadow-lg shadow-amber-500/10"
        >
          <Plus size={18} /> Agregar Servicio
        </button>
      </div>

      {/* Modal Agregar Servicio */}
      {openModal && (
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <h2 className="text-lg font-bold text-white">Nuevo Servicio / Corte</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="text-xs text-neutral-400 font-bold block mb-1">Nombre del Servicio *</label>
                <input
                  type="text"
                  placeholder="Ej: Corte Clásico + Barba"
                  className="w-full p-3.5 rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-white outline-none focus:border-amber-500 font-medium"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 font-bold block mb-1">Duración (minutos)</label>
                <input
                  type="number"
                  step="5"
                  className="w-full p-3.5 rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-white outline-none font-medium"
                  value={form.duracion}
                  onChange={(e) => setForm({ ...form, duracion: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 font-bold block mb-1">Precio ($) *</label>
                <input
                  type="number"
                  step="100"
                  className="w-full p-3.5 rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-white outline-none font-medium"
                  value={form.precio}
                  onChange={(e) => setForm({ ...form, precio: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={guardando}
                className="px-5 py-2.5 bg-amber-500 text-neutral-950 font-black text-sm rounded-xl hover:bg-amber-400 transition disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar Servicio'}
              </button>
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="px-5 py-2.5 bg-neutral-800 text-neutral-400 text-sm font-semibold rounded-xl hover:bg-neutral-700 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Servicios */}
      {loading ? (
        <div className="text-neutral-500 text-center py-16">Cargando catálogo...</div>
      ) : servicios.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {servicios.map((s: any) => (
            <div key={s.id} className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-white text-base">{s.nombre}</h3>
                  <span className="text-amber-400 font-black text-lg">${s.precio}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 mt-3 text-xs text-neutral-400 bg-neutral-800/80 px-2.5 py-1 rounded-lg">
                  <Clock size={12} /> {s.duracion} minutos
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-neutral-800 pt-3">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  s.activo ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {s.activo ? 'ACTIVO' : 'PAUSADO'}
                </span>
                <button
                  onClick={() => toggleEstado(s.id, s.activo)}
                  className="text-xs text-neutral-400 hover:text-white font-medium"
                >
                  {s.activo ? 'Pausar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-500">
          <Scissors size={36} className="mx-auto mb-3 opacity-30" />
          No tenés servicios cargados. Hacé clic en "Agregar Servicio" para armar tu catálogo.
        </div>
      )}
    </div>
  )
}