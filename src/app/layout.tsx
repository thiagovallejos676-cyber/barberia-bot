import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BarberApp - Plataforma de Gestión',
  description: 'Sistema autónomo para gestión de barberías',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-[#0a0a0e] text-neutral-100 min-h-screen antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}