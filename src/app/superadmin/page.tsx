'use client'
import { useState, useEffect } from 'react'
import { Shield, Plus, Key, Trash2, ExternalLink, RefreshCw, Database, Eraser, AlertTriangle } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

export default function SuperAdminPage() {
  const [tab, setTab] = useState<'clientes' | 'mantenimiento'>('clientes')
  const [barberias, setBarberias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [resetModal, setResetModal] = useState<any>(null)
  const [newPass, setNewPass] = useState('')
  const [guardando, setGuardando] = useState(false)

  const [form, setForm] = useState({
    nombre: '',
    slug: '',
    email: '',
    password: '',
    telefono: '',
    direccion: ''
  })

  useEffect(() => { cargarBarberias() }, [])

  const cargarBarberias = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/superadmin/barberias')
      const data = await res.json()
      if (res.ok) {
        setBarberias(data.barberias || [])
      } else {
        toast.error(data.error || 'Error al cargar los locales')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const generarSlug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const handleCrearBarberia = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre || !form.email || !form.password) {
      return toast.error('Completá nombre, email y contraseña')
    }

    setGuardando(true)
    try {
      const res = await fetch('/api/superadmin/barberias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('¡Barbería cliente dada de alta!')
        setOpenModal(false)
        setForm({ nombre: '', slug: '', email: '', password: '', telefono: '', direccion: '' })
        cargarBarberias()
      } else {
        toast.error(data.error || 'Error al crear la barbería')
      }
    } catch {
      toast.error('Error al procesar la solicitud')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminarBarberia = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar la barbería "${nombre}"? Se borrarán sus turnos, barberos y catálogo.`)) return

    try {
      const res = await fetch(`/api/superadmin/barberias?id=${id}`, { method: 'DELETE' })
      const data = await res.json()

      if (res.ok) {
        toast.success(`Barbería "${nombre}" eliminada`)
        cargarBarberias()
      } else {
        toast.error(data.error || 'Error al eliminar la barbería')
      }
    } catch {
      toast.error('Error de conexión')
    }
  }

  const handleResetPassword = async () => {
    if (!newPass) return toast.error('Escribí la nueva contraseña')

    try {
      const res = await fetch('/api/superadmin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barberia_id: resetModal.id, new_password: newPass })
      })

      if (res.ok) {
        toast.success(`Contraseña actualizada para ${resetModal.nombre}`)
        setResetModal(null)
        setNewPass('')
        cargarBarberias()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al cambiar contraseña')
      }
    } catch {
      toast.error('Error al conectar')
    }
  }

  const handleMantenimiento = async (tipo: string) => {
    if (!confirm('¿Seguro de ejecutar el mantenimiento de la base de datos?')) return
    try {
      const res = await fetch('/api/superadmin/mantenimiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo })
      })
      const data = await res.json()
      if (res.ok) toast.success(data.mensaje)
      else toast.error(data.error)
    } catch {
      toast.error('Error de conexión')
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0e] text-white p-6 md:p-10">
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto space-y-8">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#232330] pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl">
              <Shield size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">SuperAdmin (Plataforma)</h1>
              <div className="flex gap-4 mt-2">
                <button
                  onClick={() => setTab('clientes')}
                  className={`text-xs font-bold uppercase tracking-widest transition ${
                    tab === 'clientes' ? 'text-amber-400 border-b-2 border-amber-400 pb-0.5' : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  Locales Clientes
                </button>
                <button
                  onClick={() => setTab('mantenimiento')}
                  className={`text-xs font-bold uppercase tracking-widest transition ${
                    tab === 'mantenimiento' ? 'text-amber-400 border-b-2 border-amber-400 pb-0.5' : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  Mantenimiento BD
                </button>
              </div>
            </div>
          </div>

          {tab === 'clientes' && (
            <button
              onClick={() => setOpenModal(true)}
              className="px-5 py-3 gold-gradient-btn rounded-xl text-xs uppercase font-extrabold flex items-center gap-2"
            >
              <Plus size={16} /> Dar de Alta Barbería
            </button>
          )}
        </div>

        {/* TAB 1: CLIENTES */}
        {tab === 'clientes' && (
          <div className="space-y-6">

            {/* MODAL ALTA BARBERÍA */}
            {openModal && (
              <form onSubmit={handleCrearBarberia} className="p-6 rounded-3xl bg-[#13131a] border border-amber-500/30 space-y-4">
                <h2 className="text-lg font-bold text-amber-400">Alta de Nueva Barbería Cliente</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-neutral-400 font-bold block mb-1">Nombre Comercial *</label>
                    <input
                      type="text"
                      placeholder="Ej: Barbería Don José"
                      className="w-full p-3.5 rounded-xl bg-[#1a1a24] border border-[#232330] text-sm text-white outline-none"
                      value={form.nombre}
                      onChange={(e) => setForm({ ...form, nombre: e.target.value, slug: generarSlug(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 font-bold block mb-1">URL / Slug *</label>
                    <input
                      type="text"
                      placeholder="don-jose"
                      className="w-full p-3.5 rounded-xl bg-[#1a1a24] border border-[#232330] text-sm text-amber-400 outline-none font-mono"
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 font-bold block mb-1">Email del Dueño (para Login) *</label>
                    <input
                      type="email"
                      placeholder="dueno@donjose.com"
                      className="w-full p-3.5 rounded-xl bg-[#1a1a24] border border-[#232330] text-sm text-white outline-none"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 font-bold block mb-1">Contraseña Inicial *</label>
                    <input
                      type="text"
                      placeholder="Clave123!"
                      className="w-full p-3.5 rounded-xl bg-[#1a1a24] border border-[#232330] text-sm text-white outline-none"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={guardando} className="px-5 py-2.5 gold-gradient-btn rounded-xl text-xs uppercase font-extrabold disabled:opacity-50">
                    {guardando ? 'Guardando...' : 'Guardar y Dar Acceso'}
                  </button>
                  <button type="button" onClick={() => setOpenModal(false)} className="px-5 py-2.5 bg-neutral-800 text-neutral-400 text-xs rounded-xl font-bold">
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {/* MODAL RESET PASSWORD */}
            {resetModal && (
              <div className="p-6 rounded-3xl bg-[#13131a] border border-amber-500/30 space-y-4">
                <h2 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <Key size={16} /> Resetear contraseña para {resetModal.nombre}
                </h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nueva contraseña"
                    className="flex-1 p-3.5 rounded-xl bg-[#1a1a24] border border-[#232330] text-sm text-white outline-none"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                  />
                  <button onClick={handleResetPassword} className="px-5 py-3 gold-gradient-btn rounded-xl text-xs uppercase font-extrabold">
                    Cambiar
                  </button>
                  <button onClick={() => setResetModal(null)} className="px-4 py-3 bg-neutral-800 text-neutral-400 text-xs rounded-xl font-bold">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* LISTADO DE BARBERÍAS */}
            {loading ? (
              <div className="text-center py-16 text-neutral-500 text-sm">Cargando barberías registradas...</div>
            ) : barberias.length > 0 ? (
              <div className="grid gap-4">
                {barberias.map((b) => (
                  <div key={b.id} className="p-5 rounded-3xl bg-[#13131a] border border-[#232330] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-lg text-white">{b.nombre}</h3>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#1a1a24] text-amber-400 font-mono">
                          /{b.slug}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400">
                        📧 Login: <strong className="text-white">{b.email || 'Sin Email'}</strong> · Clave: <span className="font-mono text-amber-400">{b.password || '*****'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setResetModal(b)}
                        className="p-2.5 rounded-xl bg-[#1a1a24] text-neutral-300 hover:text-white transition"
                        title="Resetear Clave"
                      >
                        <RefreshCw size={16} />
                      </button>
                      <a
                        href={`/${b.slug}`}
                        target="_blank"
                        className="p-2.5 rounded-xl bg-[#1a1a24] text-amber-400 hover:bg-neutral-800 transition"
                        title="Ver Web Pública"
                      >
                        <ExternalLink size={16} />
                      </a>
                      <button
                        onClick={() => handleEliminarBarberia(b.id, b.nombre)}
                        className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition"
                        title="Eliminar Barbería"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center rounded-3xl bg-[#13131a] border border-[#232330] text-neutral-500 text-sm">
                No hay ninguna barbería dada de alta. Hacé clic en "Alta de Barbería".
              </div>
            )}

          </div>
        )}

        {/* TAB 2: MANTENIMIENTO */}
        {tab === 'mantenimiento' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-8 rounded-3xl bg-[#13131a] border border-[#232330] space-y-4">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center">
                <Database size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Limpiar Historial Viejos</h2>
              <p className="text-xs text-neutral-400">Elimina turnos completados o cancelados de hace más de 90 días para liberar almacenamiento.</p>
              <button
                onClick={() => handleMantenimiento('limpiar_viejos')}
                className="w-full py-3.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <Eraser size={14} /> Ejecutar Limpieza
              </button>
            </div>

            <div className="p-8 rounded-3xl bg-[#13131a] border border-[#232330] space-y-4">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
                <RefreshCw size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Borrar Logs de Mensajes</h2>
              <p className="text-xs text-neutral-400">Elimina historiales de logs de notificaciones enviadas de WhatsApp de hace más de 30 días.</p>
              <button
                onClick={() => handleMantenimiento('limpiar_logs')}
                className="w-full py-3.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <Eraser size={14} /> Limpiar Registros
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}