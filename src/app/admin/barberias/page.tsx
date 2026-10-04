'use client'
import { useState, useEffect } from 'react'
import { Plus, Store, ExternalLink } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

export default function BarberiasPage() {
  const [barberias, setBarberias] = useState<any[]>([])
  const [openModal, setOpenModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const [form, setForm] = useState({
    nombre: '',
    slug: '',
    direccion: '',
    telefono: '',
    horario_apertura: '09:00',
    horario_cierre: '20:00',
    intervalo_turnos: 30,
    dias_laborales: [1, 2, 3, 4, 5, 6]
  })

  useEffect(() => {
    cargarBarberias()
  }, [])

  const cargarBarberias = async () => {
    try {
      const res = await fetch('/api/admin/barberias')
      const data = await res.json()
      if (res.ok) {
        setBarberias(data.barberias || [])
      } else {
        toast.error('Error al cargar: ' + (data.error || 'Desconocido'))
      }
    } catch (err) {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const generarSlug = (texto: string) => {
    return texto
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre || !form.slug) {
      toast.error('El nombre es obligatorio')
      return
    }

    setGuardando(true)
    try {
      const res = await fetch('/api/admin/barberias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('¡Barbería creada!')
        setOpenModal(false)
        setForm({
          nombre: '', slug: '', direccion: '', telefono: '',
          horario_apertura: '09:00', horario_cierre: '20:00',
          intervalo_turnos: 30, dias_laborales: [1, 2, 3, 4, 5, 6]
        })
        cargarBarberias()
      } else {
        alert('ERROR AL CREAR: ' + (data.error || JSON.stringify(data)))
      }
    } catch (err: any) {
      alert('ERROR DE SERVIDOR: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  const toggleEstado = async (id: string, activa: boolean) => {
    await fetch('/api/admin/barberias', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, activa: !activa })
    })
    cargarBarberias()
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 bg-neutral-950 text-white min-h-screen">
      <Toaster position="top-right" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">💈 Gestión de Barberías</h1>
          <p className="text-neutral-400 text-sm mt-1">Alta y configuración de sucursales</p>
        </div>
        <button
          onClick={() => setOpenModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-neutral-950 font-bold text-sm hover:bg-amber-400 transition"
        >
          <Plus size={18} /> Nueva Barbería
        </button>
      </div>

      {openModal && (
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <h2 className="text-lg font-bold text-white">Registrar Nueva Barbería</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Nombre Comercial</label>
                <input
                  type="text"
                  placeholder="Ej: Barbería Central"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-sm focus:border-amber-500 text-white outline-none"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value, slug: generarSlug(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">URL / Slug</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-amber-400 outline-none"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Dirección</label>
                <input
                  type="text"
                  placeholder="Av. Corrientes 1234"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-sm focus:border-amber-500 text-white outline-none"
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">Teléfono</label>
                <input
                  type="text"
                  placeholder="1112345678"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-sm focus:border-amber-500 text-white outline-none"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={guardando}
                className="px-5 py-2.5 bg-amber-500 text-neutral-950 font-bold text-sm rounded-xl hover:bg-amber-400 transition disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar Barbería'}
              </button>
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="px-5 py-2.5 bg-neutral-800 text-neutral-400 text-sm rounded-xl hover:bg-neutral-700 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-neutral-500 text-center py-12">Cargando barberías...</div>
      ) : barberias.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {barberias.map((b) => (
            <div key={b.id} className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-white">{b.nombre}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      b.activa ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {b.activa ? 'ACTIVA' : 'INACTIVA'}
                    </span>
                  </div>
                  <a
                    href={`/${b.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs text-amber-500 hover:underline mt-1 font-mono"
                  >
                    /{b.slug} <ExternalLink size={12} />
                  </a>
                </div>
                <button
                  onClick={() => toggleEstado(b.id, b.activa)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white"
                >
                  {b.activa ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-500">
          <Store size={36} className="mx-auto mb-3 opacity-30" />
          No creaste ninguna barbería aún. Hacé clic en "Nueva Barbería" para empezar.
        </div>
      )}
    </div>
  )
}
