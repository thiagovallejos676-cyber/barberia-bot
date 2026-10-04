'use client'
import { useState, useEffect, use } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export default function CancelarTurnoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [turno, setTurno] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [cancelado, setCancelado] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/turnos/cancelar?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.turno) setTurno(d.turno)
        else setErrorMsg(d.error || 'El turno ya fue cancelado o no existe')
      })
      .finally(() => setLoading(false))
  }, [token])

  const confirmarCancelacion = async () => {
    setLoading(true)
    const res = await fetch('/api/turnos/cancelar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })

    if (res.ok) {
      setCancelado(true)
    } else {
      const d = await res.json()
      setErrorMsg(d.error || 'Error al cancelar')
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="min-h-screen bg-[#0a0a0e] text-white flex items-center justify-center p-4">Cargando datos del turno...</div>
  }

  if (cancelado) {
    return (
      <div className="min-h-screen bg-[#0a0a0e] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#13131a] border border-[#232330] text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full mx-auto flex items-center justify-center text-3xl">
            <CheckCircle2 size={36} />
          </div>
          <h1 className="text-2xl font-black">Turno Cancelado</h1>
          <p className="text-xs text-neutral-400">El cupo ha sido liberado automáticamente para otro cliente.</p>
        </div>
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#0a0a0e] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-[#13131a] border border-[#232330] text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full mx-auto flex items-center justify-center text-3xl">
            <AlertCircle size={36} />
          </div>
          <h1 className="text-2xl font-black">Atención</h1>
          <p className="text-xs text-neutral-400">{errorMsg}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0e] text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-3xl bg-[#13131a] border border-[#232330] space-y-6 text-center">
        <h1 className="text-2xl font-black">Cancelar Reserva</h1>
        <p className="text-xs text-neutral-400">¿Estás seguro de que deseas cancelar tu turno?</p>

        {turno && (
          <div className="p-4 rounded-2xl bg-[#1a1a24] text-left text-xs space-y-2 border border-[#232330]">
            <p>💈 <strong className="text-white">{turno.barberias?.nombre}</strong></p>
            <p>📅 <strong className="text-white">{turno.fecha}</strong> a las <strong className="text-amber-400">{turno.hora_inicio?.slice(0,5)} hs</strong></p>
            <p>✂️ Barbero: <strong className="text-white">{turno.barberos?.nombre}</strong></p>
          </div>
        )}

        <button
          onClick={confirmarCancelacion}
          className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition"
        >
          Sí, Cancelar mi Turno
        </button>
      </div>
    </div>
  )
}