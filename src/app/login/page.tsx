'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast, { Toaster } from 'react-hot-toast'
import { Lock, Mail, Scissors } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Ingresa email y contraseña')

    setCargando(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Sesión iniciada correctamente')
        router.push(data.redirect)
      } else {
        toast.error(data.error || 'Credenciales incorrectas')
      }
    } catch {
      toast.error('Error al conectar con el servidor')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a0e]">
      <Toaster position="top-right" />
      <div className="w-full max-w-md p-8 rounded-3xl bg-[#13131a] border border-[#232330] shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-2xl mx-auto flex items-center justify-center text-3xl font-black">
            ✂️
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">BarberApp SaaS</h1>
          <p className="text-xs text-neutral-400">Ingresa tu cuenta de negocio o administrador</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-neutral-400 block mb-1">Email de Acceso</label>
            <div className="flex items-center px-4 py-3 rounded-xl bg-[#1a1a24] border border-[#232330]">
              <Mail size={16} className="text-neutral-500 mr-2" />
              <input
                type="email"
                placeholder="tu@barberia.com"
                className="w-full bg-transparent text-sm text-white outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-400 block mb-1">Contraseña</label>
            <div className="flex items-center px-4 py-3 rounded-xl bg-[#1a1a24] border border-[#232330]">
              <Lock size={16} className="text-neutral-500 mr-2" />
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-transparent text-sm text-white outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full py-4 gold-gradient-btn rounded-xl text-sm uppercase tracking-wider disabled:opacity-50"
          >
            {cargando ? 'Iniciando Sesión...' : 'INICIAR SESIÓN'}
          </button>
        </form>
      </div>
    </div>
  )
}