'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast, { Toaster } from 'react-hot-toast'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Scissors,
  Settings,
  LogOut,
  Plus,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Trash2,
  Save,
  Store,
  QrCode,
  Smartphone,
  RefreshCw,
  Check,
  Archive,
  Clock,
  Filter
} from 'lucide-react'

export default function AdminDashboardPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'dashboard' | 'turnos' | 'barberos' | 'servicios' | 'whatsapp' | 'configuracion'>('dashboard')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Filtro interno para la pestaña Turnos: 'activos' (solo reservados), 'archivados' (cancelados/completados), 'todos'
  const [subFiltroTurnos, setSubFiltroTurnos] = useState<'activos' | 'archivados' | 'todos'>('activos')

  // Estado Bot WhatsApp
  const [wsStatus, setWsStatus] = useState<any>({ status: 'DISCONNECTED', qr_code: null, phone: null })
  const [loadingQr, setLoadingQr] = useState(false)

  // Modales y formularios
  const [modalBarbero, setModalBarbero] = useState(false)
  const [modalServicio, setModalServicio] = useState(false)
  const [formBarbero, setFormBarbero] = useState({ nombre: '', telefono: '' })
  const [formServicio, setFormServicio] = useState({ nombre: '', duracion: 30, precio: 5000 })
  const [formConfig, setFormConfig] = useState({
    nombre: '', direccion: '', telefono: '', horario_apertura: '09:00', horario_cierre: '20:00', intervalo_turnos: 30
  })

  useEffect(() => {
    cargarDatos()
    const interval = setInterval(cargarDatosSilencioso, 8000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let interval: any
    if (tab === 'whatsapp') {
      consultarWhatsapp()
      interval = setInterval(consultarWhatsapp, 2500)
    }
    return () => clearInterval(interval)
  }, [tab])

  const cargarDatos = async () => {
    setLoading(true)
    await cargarDatosSilencioso()
    setLoading(false)
  }

  const cargarDatosSilencioso = async () => {
    try {
      const res = await fetch('/api/admin/full-data')
      const result = await res.json()
      if (res.ok) {
        setData(result)
        if (result.barberia) {
          setFormConfig({
            nombre: result.barberia.nombre || '',
            direccion: result.barberia.direccion || '',
            telefono: result.barberia.telefono || '',
            horario_apertura: result.barberia.horario_apertura?.slice(0, 5) || '09:00',
            horario_cierre: result.barberia.horario_cierre?.slice(0, 5) || '20:00',
            intervalo_turnos: result.barberia.intervalo_turnos || 30
          })
        }
      }
    } catch {
      console.error('Error sincronizando datos')
    }
  }

  const consultarWhatsapp = async () => {
    try {
      const res = await fetch('/api/admin/whatsapp')
      const d = await res.json()
      if (res.ok) setWsStatus(d)
    } catch {
      console.error('Error consultando WhatsApp')
    }
  }

  const solicitarQr = async () => {
    setLoadingQr(true)
    try {
      await fetch('/api/admin/whatsapp', { method: 'POST' })
      toast.success('Solicitando Código QR...')
      setTimeout(consultarWhatsapp, 1500)
    } catch {
      toast.error('Error solicitando QR')
    } finally {
      setLoadingQr(false)
    }
  }

  const desconectarWhatsapp = async () => {
    if (!confirm('¿Desconectar el Bot de WhatsApp de este local?')) return
    await fetch('/api/admin/whatsapp', { method: 'DELETE' })
    toast.success('Desconectando WhatsApp...')
    setTimeout(consultarWhatsapp, 1500)
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const handleCrearBarbero = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formBarbero.nombre) return toast.error('Ingresá el nombre')
    const res = await fetch('/api/admin/barberos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formBarbero)
    })
    if (res.ok) {
      toast.success('Barbero agregado')
      setModalBarbero(false)
      setFormBarbero({ nombre: '', telefono: '' })
      cargarDatosSilencioso()
    } else toast.error('Error al guardar')
  }

  const handleBorrarBarbero = async (id: string, nombre: string) => {
    if (!confirm(`¿Borrar a "${nombre}"?`)) return
    const res = await fetch(`/api/admin/barberos?id=${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Eliminado'); cargarDatosSilencioso() }
  }

  const handleCrearServicio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formServicio.nombre || !formServicio.precio) return toast.error('Completá datos')
    const res = await fetch('/api/admin/servicios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formServicio)
    })
    if (res.ok) {
      toast.success('Servicio agregado')
      setModalServicio(false)
      setFormServicio({ nombre: '', duracion: 30, precio: 5000 })
      cargarDatosSilencioso()
    } else toast.error('Error al guardar')
  }

  const handleBorrarServicio = async (id: string, nombre: string) => {
    if (!confirm(`¿Borrar "${nombre}"?`)) return
    const res = await fetch(`/api/admin/servicios?id=${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Eliminado'); cargarDatosSilencioso() }
  }

  const handleCambiarEstadoTurno = async (id: string, estado: string) => {
    const res = await fetch('/api/admin/turnos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, estado })
    })
    if (res.ok) {
      toast.success(estado === 'completado' ? 'Turno completado y archivado' : 'Turno cancelado y archivado')
      cargarDatosSilencioso()
    }
  }

  const handleGuardarConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/admin/configuracion', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formConfig)
    })
    if (res.ok) toast.success('Configuración de horarios guardada')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0e] text-white flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Cargando panel...</p>
        </div>
      </div>
    )
  }

  const barberia = data?.barberia
  const stats = data?.stats || {}
  const todosTurnos = data?.turnos || []

  // FILTRADO DE TURNOS PARA MANTENER LA AGENDA LIMPIA
  const turnosActivos = todosTurnos.filter((t: any) => t.estado === 'reservado')
  const turnosArchivados = todosTurnos.filter((t: any) => t.estado === 'cancelado' || t.estado === 'completado')

  const turnosAmostrar = 
    subFiltroTurnos === 'activos' ? turnosActivos :
    subFiltroTurnos === 'archivados' ? turnosArchivados : todosTurnos

  return (
    <div className="min-h-screen bg-[#0a0a0e] text-white p-4 md:p-8">
      <Toaster position="top-right" />
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="p-6 rounded-3xl bg-[#13131a] border border-[#232330] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-neutral-950 flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-500/20">
              💈
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">{barberia?.nombre || 'Mi Barbería'}</h1>
              <p className="text-xs text-neutral-400 flex items-center gap-2 mt-0.5">
                <span>📍 {barberia?.direccion || 'Sin dirección configurada'}</span>
                <span>•</span>
                <span>🕐 {barberia?.horario_apertura?.slice(0,5)} - {barberia?.horario_cierre?.slice(0,5)} hs</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {barberia?.slug && (
              <a
                href={`/${barberia.slug}`}
                target="_blank"
                className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500 hover:text-black transition flex items-center gap-1.5"
              >
                <span>Ver Web Pública</span>
                <ExternalLink size={14} />
              </a>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500 hover:text-white transition flex items-center gap-1.5"
            >
              <LogOut size={14} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>

        {/* PESTAÑAS PRINCIPALES */}
        <div className="flex overflow-x-auto gap-2 p-1.5 rounded-2xl bg-[#13131a] border border-[#232330]">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'turnos', label: `Turnos Activos (${turnosActivos.length})`, icon: Calendar },
            { id: 'barberos', label: `Equipo (${data?.barberos?.length || 0})`, icon: Users },
            { id: 'servicios', label: `Servicios (${data?.servicios?.length || 0})`, icon: Scissors },
            { id: 'whatsapp', label: 'WhatsApp Bot', icon: QrCode },
            { id: 'configuracion', label: 'Configuración', icon: Settings },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all whitespace-nowrap flex-1 justify-center ${
                tab === t.id
                  ? 'bg-amber-500 text-neutral-950 shadow-lg shadow-amber-500/20'
                  : 'text-neutral-400 hover:text-white hover:bg-[#1a1a24]'
              }`}
            >
              <t.icon size={16} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: DASHBOARD */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-5 rounded-3xl bg-[#13131a] border border-[#232330]">
                <p className="text-xs text-neutral-400 font-bold uppercase">Turnos Activos</p>
                <p className="text-3xl font-black text-amber-400 mt-2">{turnosActivos.length}</p>
              </div>
              <div className="p-5 rounded-3xl bg-[#13131a] border border-[#232330]">
                <p className="text-xs text-neutral-400 font-bold uppercase">Cancelados / Historial</p>
                <p className="text-3xl font-black text-red-400 mt-2">{turnosArchivados.length}</p>
              </div>
              <div className="p-5 rounded-3xl bg-[#13131a] border border-[#232330]">
                <p className="text-xs text-neutral-400 font-bold uppercase">Barberos Activos</p>
                <p className="text-3xl font-black text-emerald-400 mt-2">{stats.totalBarberos || 0}</p>
              </div>
              <div className="p-5 rounded-3xl bg-[#13131a] border border-[#232330]">
                <p className="text-xs text-neutral-400 font-bold uppercase">Servicios Activos</p>
                <p className="text-3xl font-black text-blue-400 mt-2">{stats.totalServicios || 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => { setTab('barberos'); setModalBarbero(true) }}
                className="p-6 rounded-3xl bg-[#13131a] border border-[#232330] hover:border-amber-500/50 text-left transition space-y-2 group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                  <Plus size={20} />
                </div>
                <h3 className="font-bold text-lg text-white group-hover:text-amber-400">Agregar Barbero al Equipo</h3>
                <p className="text-xs text-neutral-400">Sumá profesionales para que tus clientes los seleccionen en la web.</p>
              </button>

              <button
                onClick={() => setTab('whatsapp')}
                className="p-6 rounded-3xl bg-[#13131a] border border-[#232330] hover:border-amber-500/50 text-left transition space-y-2 group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                  <QrCode size={20} />
                </div>
                <h3 className="font-bold text-lg text-white group-hover:text-amber-400">Conectar Bot de WhatsApp</h3>
                <p className="text-xs text-neutral-400">Escaneá el QR con tu WhatsApp para enviar recordatorios 2hs antes.</p>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: TURNOS CON AGENDA LIMPIA Y SUB-FILTROS */}
        {tab === 'turnos' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232330] pb-4">
              <div>
                <h2 className="text-xl font-bold">Agenda de Reservas</h2>
                <p className="text-xs text-neutral-400">Gestión de citas de clientes</p>
              </div>

              {/* BOTONES DE SUB-FILTRO */}
              <div className="flex items-center gap-1.5 p-1 bg-[#1a1a24] rounded-xl border border-[#232330]">
                <button
                  onClick={() => setSubFiltroTurnos('activos')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    subFiltroTurnos === 'activos' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Activos ({turnosActivos.length})</span>
                </button>

                <button
                  onClick={() => setSubFiltroTurnos('archivados')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    subFiltroTurnos === 'archivados' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Archive size={14} />
                  <span>Historial / Archivados ({turnosArchivados.length})</span>
                </button>

                <button
                  onClick={() => setSubFiltroTurnos('todos')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    subFiltroTurnos === 'todos' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <span>Todos ({todosTurnos.length})</span>
                </button>
              </div>
            </div>

            {/* LISTA FILTRADA DE TURNOS */}
            {turnosAmostrar.length > 0 ? (
              <div className="space-y-3">
                {turnosAmostrar.map((t: any) => (
                  <div key={t.id} className="p-4 rounded-2xl bg-[#13131a] border border-[#232330] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[70px]">
                        <p className="font-mono font-black text-amber-400 text-lg">{t.hora_inicio?.slice(0, 5)}</p>
                        <p className="text-[10px] text-neutral-500">{t.fecha}</p>
                      </div>
                      <div>
                        <p className="font-bold text-white text-base">{t.clientes?.nombre || 'Cliente'}</p>
                        <p className="text-xs text-neutral-400">{t.servicios?.nombre} · {t.barberos?.nombre}</p>
                        <p className="text-[11px] text-neutral-500 font-mono mt-0.5">📱 {t.clientes?.telefono}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                        t.estado === 'reservado' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        t.estado === 'cancelado' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {t.estado}
                      </span>

                      {t.estado === 'reservado' && (
                        <>
                          <button
                            onClick={() => handleCambiarEstadoTurno(t.id, 'completado')}
                            className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black transition"
                            title="Marcar Completado (Archiva el turno)"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                          <button
                            onClick={() => handleCambiarEstadoTurno(t.id, 'cancelado')}
                            className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition"
                            title="Cancelar Turno (Archiva el turno)"
                          >
                            <XCircle size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center rounded-3xl bg-[#13131a] border border-[#232330] text-neutral-500 text-sm">
                {subFiltroTurnos === 'activos' ? '✨ ¡Excelente! No hay turnos cancelados ni pendientes. Tu agenda activa está limpia.' : 'No hay registros en esta carpeta.'}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BARBEROS */}
        {tab === 'barberos' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Equipo de Barberos</h2>
              <button onClick={() => setModalBarbero(true)} className="px-4 py-2.5 gold-gradient-btn rounded-xl text-xs uppercase font-extrabold flex items-center gap-1.5">
                <Plus size={16} /> Agregar Barbero
              </button>
            </div>

            {modalBarbero && (
              <form onSubmit={handleCrearBarbero} className="p-6 rounded-3xl bg-[#13131a] border border-amber-500/30 space-y-4">
                <h3 className="font-bold text-amber-400">Nuevo Barbero / Especialista</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Nombre Completo *"
                    className="p-3.5 rounded-xl bg-[#1a1a24] border border-[#232330] text-sm text-white outline-none"
                    value={formBarbero.nombre}
                    onChange={(e) => setFormBarbero({ ...formBarbero, nombre: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Teléfono Personal"
                    className="p-3.5 rounded-xl bg-[#1a1a24] border border-[#232330] text-sm text-white outline-none"
                    value={formBarbero.telefono}
                    onChange={(e) => setFormBarbero({ ...formBarbero, telefono: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-5 py-2.5 gold-gradient-btn rounded-xl text-xs uppercase font-bold">Guardar</button>
                  <button type="button" onClick={() => setModalBarbero(false)} className="px-4 py-2.5 bg-neutral-800 text-neutral-400 text-xs rounded-xl">Cancelar</button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {data?.barberos?.map((b: any) => (
                <div key={b.id} className="p-5 rounded-3xl bg-[#13131a] border border-[#232330] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xl">✂️</div>
                    <div>
                      <p className="font-bold text-white text-base">{b.nombre}</p>
                      <p className="text-xs text-neutral-500">{b.telefono || 'Sin teléfono'}</p>
                    </div>
                  </div>
                  <button onClick={() => handleBorrarBarbero(b.id, b.nombre)} className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: SERVICIOS */}
        {tab === 'servicios' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Catálogo de Servicios</h2>
              <button onClick={() => setModalServicio(true)} className="px-4 py-2.5 gold-gradient-btn rounded-xl text-xs uppercase font-extrabold flex items-center gap-1.5">
                <Plus size={16} /> Agregar Servicio
              </button>
            </div>

            {modalServicio && (
              <form onSubmit={handleCrearServicio} className="p-6 rounded-3xl bg-[#13131a] border border-amber-500/30 space-y-4">
                <h3 className="font-bold text-amber-400">Nuevo Servicio / Corte</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Nombre del Servicio *"
                    className="p-3.5 rounded-xl bg-[#1a1a24] border border-[#232330] text-sm text-white outline-none md:col-span-3"
                    value={formServicio.nombre}
                    onChange={(e) => setFormServicio({ ...formServicio, nombre: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="Duración en minutos"
                    className="p-3.5 rounded-xl bg-[#1a1a24] border border-[#232330] text-sm text-white outline-none"
                    value={formServicio.duracion}
                    onChange={(e) => setFormServicio({ ...formServicio, duracion: Number(e.target.value) })}
                  />
                  <input
                    type="number"
                    placeholder="Precio en $"
                    className="p-3.5 rounded-xl bg-[#1a1a24] border border-[#232330] text-sm text-white outline-none"
                    value={formServicio.precio}
                    onChange={(e) => setFormServicio({ ...formServicio, precio: Number(e.target.value) })}
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-5 py-2.5 gold-gradient-btn rounded-xl text-xs uppercase font-bold">Guardar</button>
                  <button type="button" onClick={() => setModalServicio(false)} className="px-4 py-2.5 bg-neutral-800 text-neutral-400 text-xs rounded-xl">Cancelar</button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {data?.servicios?.map((s: any) => (
                <div key={s.id} className="p-5 rounded-3xl bg-[#13131a] border border-[#232330] flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-base">{s.nombre}</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">⏱ {s.duracion} min · <strong className="text-amber-400">${s.precio}</strong></p>
                  </div>
                  <button onClick={() => handleBorrarServicio(s.id, s.nombre)} className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: WHATSAPP BOT */}
        {tab === 'whatsapp' && (
          <div className="p-6 md:p-8 rounded-3xl bg-[#13131a] border border-[#232330] space-y-6 max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Smartphone size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Bot de WhatsApp para {barberia?.nombre}</h2>
                <p className="text-xs text-neutral-400">Vincular cuenta de WhatsApp para envío de recordatorios 2hs antes</p>
              </div>
            </div>

            {wsStatus.status === 'CONNECTED' && (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-500 text-neutral-950 rounded-full flex items-center justify-center font-bold mx-auto">
                  <Check size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-emerald-400">WhatsApp Conectado</h3>
                  <p className="text-xs text-neutral-300 mt-1">
                    Número vinculado: <strong className="text-white font-mono">{wsStatus.phone || 'VINCULADO'}</strong>
                  </p>
                </div>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  Tu bot está activo enviando mensajes automáticos 2 horas antes de cada turno.
                </p>
                <button
                  onClick={desconectarWhatsapp}
                  className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition mt-2"
                >
                  Desconectar WhatsApp
                </button>
              </div>
            )}

            {wsStatus.status !== 'CONNECTED' && (
              <div className="space-y-4 text-center">
                {wsStatus.qr_code ? (
                  <div className="space-y-3 p-6 rounded-2xl bg-[#1a1a24] border border-[#232330] max-w-xs mx-auto">
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Escaneá este Código QR</p>
                    <div className="bg-white p-3 rounded-xl inline-block shadow-xl">
                      <img src={wsStatus.qr_code} alt="QR WhatsApp" className="w-52 h-52 mx-auto" />
                    </div>
                    <div className="text-[11px] text-neutral-400 text-left space-y-1 pt-2">
                      <p>1. Abrí WhatsApp en tu teléfono de la barbería.</p>
                      <p>2. Ve a <strong>Ajustes ➔ Dispositivos vinculados</strong>.</p>
                      <p>3. Tocá en <strong>Vincular un dispositivo</strong> y apunta la cámara a la pantalla.</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-[#1a1a24] border border-[#232330] space-y-4">
                    <p className="text-xs text-neutral-400">
                      Para que tu barbería envíe los recordatorios desde tu propio WhatsApp, haz clic en el botón para generar el Código QR.
                    </p>
                    <button
                      disabled={loadingQr}
                      onClick={solicitarQr}
                      className="px-6 py-3.5 gold-gradient-btn rounded-xl text-xs uppercase font-black inline-flex items-center gap-2"
                    >
                      <RefreshCw size={14} className={loadingQr ? 'animate-spin' : ''} />
                      {loadingQr ? 'Generando QR...' : 'Generar Código QR de WhatsApp'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: CONFIGURACIÓN */}
        {tab === 'configuracion' && (
          <form onSubmit={handleGuardarConfig} className="p-6 md:p-8 rounded-3xl bg-[#13131a] border border-[#232330] space-y-4 max-w-xl">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Store size={20} className="text-amber-400" /> Configuración de la Barbería
            </h2>

            <div>
              <label className="text-xs font-bold text-neutral-400 block mb-1">Nombre Comercial</label>
              <input
                type="text"
                className="w-full p-3.5 rounded-xl bg-[#1a1a24] border border-[#232330] text-sm text-white outline-none"
                value={formConfig.nombre}
                onChange={(e) => setFormConfig({ ...formConfig, nombre: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-400 block mb-1">Dirección del Local</label>
              <input
                type="text"
                className="w-full p-3.5 rounded-xl bg-[#1a1a24] border border-[#232330] text-sm text-white outline-none"
                value={formConfig.direccion}
                onChange={(e) => setFormConfig({ ...formConfig, direccion: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-400 block mb-1">Teléfono / WhatsApp</label>
              <input
                type="text"
                className="w-full p-3.5 rounded-xl bg-[#1a1a24] border border-[#232330] text-sm text-white outline-none"
                value={formConfig.telefono}
                onChange={(e) => setFormConfig({ ...formConfig, telefono: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-bold text-neutral-400 block mb-1">Horario Apertura</label>
                <input
                  type="time"
                  className="w-full p-3.5 rounded-xl bg-[#1a1a24] border border-[#232330] text-sm text-white outline-none"
                  value={formConfig.horario_apertura}
                  onChange={(e) => setFormConfig({ ...formConfig, horario_apertura: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-400 block mb-1">Horario Cierre</label>
                <input
                  type="time"
                  className="w-full p-3.5 rounded-xl bg-[#1a1a24] border border-[#232330] text-sm text-white outline-none"
                  value={formConfig.horario_cierre}
                  onChange={(e) => setFormConfig({ ...formConfig, horario_cierre: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-400 block mb-1">Intervalo entre turnos (minutos)</label>
              <select
                className="w-full p-3.5 rounded-xl bg-[#1a1a24] border border-[#232330] text-sm text-white outline-none"
                value={formConfig.intervalo_turnos}
                onChange={(e) => setFormConfig({ ...formConfig, intervalo_turnos: Number(e.target.value) })}
              >
                <option value={15}>15 minutos</option>
                <option value={20}>20 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>60 minutos</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-4 gold-gradient-btn rounded-xl text-xs uppercase font-extrabold flex items-center justify-center gap-2 mt-4"
            >
              <Save size={16} /> Guardar Cambios
            </button>
          </form>
        )}

      </div>
    </div>
  )
}