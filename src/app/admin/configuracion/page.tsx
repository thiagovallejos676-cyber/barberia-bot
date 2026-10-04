'use client'
import { useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { Save, Store } from 'lucide-react'

export default function ConfiguracionPage() {
  const [form, setForm] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
    horario_apertura: '09:00',
    horario_cierre: '20:00',
    intervalo_turnos: 30
  })
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    fetch('/api/admin/configuracion')
      .then(r => r.json())
      .then(data => {
        if (data.barberia) {
          setForm({
            nombre: data.barberia.nombre || '',
            direccion: data.barberia.direccion || '',
            telefono: data.barberia.telefono || '',
            horario_apertura: data.barberia.horario_apertura?.slice(0,5) || '09:00',
            horario_cierre: data.barberia.horario_cierre?.slice(0,5) || '20:00',
            intervalo_turnos: data.barberia.intervalo_turnos || 30
          })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    try {
      const res = await fetch('/api/admin/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (res.ok) {
        toast.success('Configuración guardada')
      } else {
        toast.error('Error al guardar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setGuardando(false)
    }
  }

  if (loading) return <div className="text-neutral-500 text-center py-20">Cargando...</div>

  return (
    <div className="space-y-6 max-w-xl">
      <Toaster position="top-right" />
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Store size={24} className="text-amber-500" /> Configuración
        </h1>
        <p className="text-neutral-400 text-sm mt-1">Datos de tu barbería y horarios de atención</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
        <div>
          <label className="text-xs text-neutral-400 font-bold block mb-1">Nombre de la Barbería</label>
          <input
            type="text"
            className="w-full p-3.5 rounded-xl bg-neutral-800 border border-neutral-700 text-white text-sm outline-none focus:border-amber-500"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs text-neutral-400 font-bold block mb-1">Dirección</label>
          <input
            type="text"
            className="w-full p-3.5 rounded-xl bg-neutral-800 border border-neutral-700 text-white text-sm outline-none focus:border-amber-500"
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs text-neutral-400 font-bold block mb-1">Teléfono / WhatsApp</label>
          <input
            type="text"
            className="w-full p-3.5 rounded-xl bg-neutral-800 border border-neutral-700 text-white text-sm outline-none focus:border-amber-500"
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-400 font-bold block mb-1">Apertura</label>
            <input
              type="time"
              className="w-full p-3.5 rounded-xl bg-neutral-800 border border-neutral-700 text-white text-sm outline-none"
              value={form.horario_apertura}
              onChange={(e) => setForm({ ...form, horario_apertura: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-neutral-400 font-bold block mb-1">Cierre</label>
            <input
              type="time"
              className="w-full p-3.5 rounded-xl bg-neutral-800 border border-neutral-700 text-white text-sm outline-none"
              value={form.horario_cierre}
              onChange={(e) => setForm({ ...form, horario_cierre: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-neutral-400 font-bold block mb-1">Intervalo entre turnos (minutos)</label>
          <select
            className="w-full p-3.5 rounded-xl bg-neutral-800 border border-neutral-700 text-white text-sm outline-none"
            value={form.intervalo_turnos}
            onChange={(e) => setForm({ ...form, intervalo_turnos: Number(e.target.value) })}
          >
            <option value={15}>15 min</option>
            <option value={20}>20 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>60 min</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={guardando}
          className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-black text-sm rounded-xl hover:opacity-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save size={16} />
          {guardando ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </form>
    </div>
  )
}