'use client'
import { useState, useEffect } from 'react'
import toast, { Toaster } from 'react-hot-toast'

export default function BookingWizard({ barberia, barberos = [], servicios = [] }: any) {
  const [paso, setPaso] = useState(1)
  const [cargando, setCargando] = useState(false)
  const [cargandoSlots, setCargandoSlots] = useState(false)
  const [slotsReales, setSlotsReales] = useState<string[]>([])

  const [seleccion, setSeleccion] = useState({
    servicio: null as any,
    barbero: null as any,
    fecha: '',
    hora: '',
    nombre: '',
    telefono: ''
  })

  useEffect(() => {
    if (seleccion.fecha && seleccion.barbero) {
      consultarSlots(seleccion.barbero.id, seleccion.fecha)
    }
  }, [seleccion.fecha, seleccion.barbero])

  const consultarSlots = async (barberoId: string, fecha: string) => {
    setCargandoSlots(true)
    setSlotsReales([])
    try {
      const res = await fetch(`/api/turnos/disponibles?barberia_id=${barberia.id}&barbero_id=${barberoId}&fecha=${fecha}`)
      const data = await res.json()
      if (res.ok) {
        setSlotsReales(data.slots || [])
      } else {
        toast.error('Error al cargar horarios')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setCargandoSlots(false)
    }
  }

  const confirmarReserva = async () => {
    if (!seleccion.nombre || !seleccion.telefono) {
      toast.error('Completá nombre y WhatsApp')
      return
    }

    setCargando(true)
    try {
      const res = await fetch('/api/turnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberia_id: barberia.id,
          barbero_id: seleccion.barbero.id,
          servicio_id: seleccion.servicio.id,
          fecha: seleccion.fecha,
          hora_inicio: seleccion.hora,
          cliente_nombre: seleccion.nombre,
          cliente_telefono: seleccion.telefono
        })
      })

      if (res.ok) {
        setPaso(5)
      } else {
        const d = await res.json()
        toast.error(d.error || 'Error al agendar')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-center" />

      {paso < 5 && (
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-1.5 rounded-full ${paso >= i ? 'bg-amber-500' : 'bg-neutral-800'}`} />
          ))}
        </div>
      )}

      {/* PASO 1 */}
      {paso === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">1. Elegí un servicio</h2>
          <div className="grid gap-3">
            {servicios.map((s: any) => (
              <button
                key={s.id}
                onClick={() => { setSeleccion({...seleccion, servicio: s}); setPaso(2) }}
                className="flex justify-between items-center p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-500 transition text-left"
              >
                <div>
                  <p className="font-bold text-white">{s.nombre}</p>
                  <p className="text-xs text-neutral-400">{s.duracion} min</p>
                </div>
                <span className="text-amber-400 font-bold">${s.precio}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PASO 2 */}
      {paso === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">2. Elegí a tu barbero</h2>
          <div className="grid grid-cols-2 gap-3">
            {barberos.map((b: any) => (
              <button
                key={b.id}
                onClick={() => { setSeleccion({...seleccion, barbero: b}); setPaso(3) }}
                className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-500 text-center space-y-2"
              >
                <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl mx-auto flex items-center justify-center font-bold text-xl">✂️</div>
                <p className="font-bold text-sm text-white">{b.nombre}</p>
              </button>
            ))}
          </div>
          <button onClick={() => setPaso(1)} className="text-neutral-500 text-xs w-full text-center mt-2">← Volver</button>
        </div>
      )}

      {/* PASO 3 */}
      {paso === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">3. Seleccioná Fecha y Hora</h2>
          <div>
            <label className="text-xs text-neutral-400 block mb-1 font-bold">Fecha del Turno</label>
            <input 
              type="date" 
              min={new Date().toISOString().split('T')[0]}
              className="w-full p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white outline-none focus:border-amber-500 font-semibold"
              value={seleccion.fecha}
              onChange={(e) => setSeleccion({...seleccion, fecha: e.target.value})}
            />
          </div>

          <div className="pt-2">
            <label className="text-xs text-neutral-400 block mb-2 font-bold">
              Horarios de Atención del Local
            </label>

            {cargandoSlots ? (
              <div className="p-8 text-center text-amber-400 text-xs font-bold animate-pulse">
                ⏳ Obteniendo horarios configurados...
              </div>
            ) : slotsReales.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
                {slotsReales.map((h) => (
                  <button 
                    key={h}
                    onClick={() => { setSeleccion({...seleccion, hora: h}); setPaso(4) }}
                    className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-bold text-white hover:bg-amber-500 hover:text-black hover:border-amber-500 transition"
                  >
                    {h} hs
                  </button>
                ))}
              </div>
            ) : seleccion.fecha ? (
              <div className="p-6 text-center bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
                No hay horarios disponibles para esta fecha.
              </div>
            ) : (
              <p className="text-xs text-amber-500/80 text-center py-4">Seleccioná una fecha arriba para ver los horarios reales.</p>
            )}
          </div>

          <button onClick={() => setPaso(2)} className="text-neutral-500 text-xs w-full text-center mt-2">← Volver</button>
        </div>
      )}

      {/* PASO 4 */}
      {paso === 4 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">4. Tus Datos para Confirmar</h2>
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-sm space-y-1">
             <p className="text-amber-400 font-bold">{seleccion.servicio?.nombre} con {seleccion.barbero?.nombre}</p>
             <p className="text-neutral-300">📅 {seleccion.fecha} a las {seleccion.hora} hs</p>
          </div>
          <input 
            type="text" 
            placeholder="Tu Nombre Completo"
            className="w-full p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white outline-none"
            value={seleccion.nombre}
            onChange={(e) => setSeleccion({...seleccion, nombre: e.target.value})}
          />
          <input 
            type="tel" 
            placeholder="WhatsApp (ej: 5491112345678)"
            className="w-full p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white outline-none"
            value={seleccion.telefono}
            onChange={(e) => setSeleccion({...seleccion, telefono: e.target.value})}
          />
          <button 
            disabled={cargando}
            className="w-full p-4 gold-gradient-btn rounded-xl text-xs uppercase tracking-wider disabled:opacity-50"
            onClick={confirmarReserva}
          >
            {cargando ? 'RESERVANDO...' : 'CONFIRMAR RESERVA'}
          </button>
          <button onClick={() => setPaso(3)} className="text-neutral-500 text-xs w-full text-center mt-2">← Volver</button>
        </div>
      )}

      {/* PASO 5 */}
      {paso === 5 && (
        <div className="text-center space-y-4 py-6">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full mx-auto flex items-center justify-center text-3xl">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-white">¡Turno Reservado!</h2>
          <p className="text-neutral-400 text-sm max-w-xs mx-auto">
            Te esperamos el <strong className="text-white">{seleccion.fecha}</strong> a las <strong className="text-white">{seleccion.hora} hs</strong>.
          </p>
        </div>
      )}
    </div>
  )
}