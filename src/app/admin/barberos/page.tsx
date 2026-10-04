'use client'
import { useState, useEffect } from 'react'
import { Plus, Users, Scissors, Phone } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

export default function BarberosPage() {
  const [barberos, setBarberos] = useState<any[]>([])
  const [openModal, setOpenModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const [form, setForm] = useState({
    nombre: '',
    telefono: ''
  })

  useEffect(() => {
    cargarBarberos()
  }, [])

  const cargarBarberos = async () => {
    try {
      const res = await fetch('/api/admin/barberos')
      const data = await res.json()
      setBarberos(data.barberos || [])
    } catch {
      toast.error('Error al cargar equipo')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre) {
      toast.error('El nombre del barbero es obligatorio')
      return
    }

    setGuardando(true)
    try {
      const res = await fetch('/api/admin/barberos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('¡Barbero agregado al equipo!')
        setOpenModal(false)
        setForm({ nombre: '', telefono: '' })
        cargarBarberos()
      } else {
        toast.error(data.error || 'Error al guardar barbero')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setGuardando(false)
    }
  }

  const toggleEstado = async (id: string, activo: boolean) => {
    await fetch('/api/admin/barberos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, activo: !activo })
    })
    cargarBarberos()
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Users size={24} className="text-amber-500" /> Mi Equipo de Barberos
          </h1>
          <p className="text-neutral-400 text-sm mt-1">Gestioná los profesionales de tu barbería</p>
        </div>
        <button
          onClick={() => setOpenModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-black text-sm hover:opacity-95 transition shadow-lg shadow-amber-500/10"
        >
          <Plus size={18} /> Agregar Barbero
        </button>
      </div>

      {/* Modal Agregar Barbero */}
      {openModal && (
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <h2 className="text-lg font-bold text-white">Nuevo Barbero / Especialista</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-neutral-400 font-bold block mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  placeholder="Ej: Marcos Pérez"
                  className="w-full p-3.5 rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-white outline-none focus:border-amber-500 font-medium"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 font-bold block mb-1">Teléfono Personal</label>
                <input
                  type="text"
                  placeholder="Ej: 5491198765432"
                  className="w-full p-3.5 rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-white outline-none focus:border-amber-500 font-medium"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={guardando}
                className="px-5 py-2.5 bg-amber-500 text-neutral-950 font-black text-sm rounded-xl hover:bg-amber-400 transition disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar Barbero'}
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

      {/* Lista de Barberos */}
      {loading ? (
        <div className="text-neutral-500 text-center py-16">Cargando equipo...</div>
      ) : barberos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {barberos.map((b: any) => (
            <div key={b.id} className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-xl">
                  ✂️
                </div>
                <div>
                  <h3 className="font-bold text-white text-base leading-tight">{b.nombre}</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">{b.telefono || 'Sin teléfono'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-neutral-800 pt-3">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  b.activo ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {b.activo ? 'ACTIVO' : 'PAUSADO'}
                </span>
                <button
                  onClick={() => toggleEstado(b.id, b.activo)}
                  className="text-xs text-neutral-400 hover:text-white font-medium"
                >
                  {b.activo ? 'Pausar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-500">
          <Users size={36} className="mx-auto mb-3 opacity-30" />
          No tenés barberos cargados todavía. Hacé clic en "Agregar Barbero" para sumar al primero.
        </div>
      )}
    </div>
  )
}