import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys'
import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'
import pino from 'pino'
import http from 'http'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://barberia-saas.vercel.app'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ ERROR GRAVE: Faltan variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 1. SERVIDOR DE SALUD PARA RENDER (Obligatorio en puerto 10000)
const PORT = process.env.PORT || 10000
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('BarberBot Engine 24/7 Active 🚀')
}).listen(PORT, () => {
  console.log(`🌐 [RENDER] Servidor HTTP escuchando en puerto ${PORT}`)
})

const activeSockets = new Map<string, any>()
const isInitializing = new Set<string>()

console.log('🤖 [BOT ENGINE] Escaneando solicitudes de WhatsApp...')

async function syncSessions() {
  try {
    const { data: sessions, error } = await supabase.from('whatsapp_sessions').select('*')

    if (error) {
      console.error('❌ Error consultando whatsapp_sessions:', error.message)
      return
    }

    for (const session of sessions || []) {
      const barberiaId = session.barberia_id

      if ((session.status === 'INIT_REQUEST' || session.status === 'QR_READY') && !activeSockets.has(barberiaId) && !isInitializing.has(barberiaId)) {
        console.log(`⚡ Detectada solicitud para barbería ID: ${barberiaId}`)
        initBarberiaSession(barberiaId)
      }

      if (session.status === 'DISCONNECT_REQUEST') {
        if (activeSockets.has(barberiaId)) {
          const sock = activeSockets.get(barberiaId)
          try { await sock.logout() } catch {}
          activeSockets.delete(barberiaId)
        }
        isInitializing.delete(barberiaId)

        const sessionFolder = path.join(process.cwd(), 'whatsapp-bot', 'auth_sessions', `session_${barberiaId}`)
        if (fs.existsSync(sessionFolder)) {
          fs.rmSync(sessionFolder, { recursive: true, force: true })
        }

        await supabase.from('whatsapp_sessions').update({
          status: 'DISCONNECTED', qr_code: null, phone: null, updated_at: new Date().toISOString()
        }).eq('barberia_id', barberiaId)
      }
    }
  } catch (err: any) {
    console.error('❌ Error en syncSessions:', err.message)
  }
}

async function initBarberiaSession(barberiaId: string) {
  if (isInitializing.has(barberiaId)) return
  isInitializing.add(barberiaId)

  console.log(`⚡ [INIT] Creando sesión de WhatsApp para ID: ${barberiaId}`)
  const sessionFolder = path.join(process.cwd(), 'whatsapp-bot', 'auth_sessions', `session_${barberiaId}`)
  if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder, { recursive: true })

  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionFolder)

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' })
    })

    activeSockets.set(barberiaId, sock)
    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        console.log(`📸 [QR GENERADO] Guardando imagen QR para barbería ID: ${barberiaId}`)
        try {
          const qrDataUrl = await QRCode.toDataURL(qr)
          const { error: errUpsert } = await supabase.from('whatsapp_sessions').upsert({
            barberia_id: barberiaId,
            status: 'QR_READY',
            qr_code: qrDataUrl,
            updated_at: new Date().toISOString()
          })

          if (errUpsert) console.error('❌ Error guardando QR en Supabase:', errUpsert.message)
          else console.log('✅ QR guardado en Supabase exitosamente. La web ya lo está mostrando!')
        } catch (e: any) {
          console.error('❌ Error convirtiendo QR:', e.message)
        }
      }

      if (connection === 'open') {
        isInitializing.delete(barberiaId)
        const rawPhone = sock.user?.id?.split(':')[0] || 'CONECTADO'
        console.log(`🟢 [CONECTADO EN NUBE] Barbería ID: ${barberiaId} | Teléfono: +${rawPhone}`)

        await supabase.from('whatsapp_sessions').upsert({
          barberia_id: barberiaId,
          status: 'CONNECTED',
          qr_code: null,
          phone: `+${rawPhone}`,
          updated_at: new Date().toISOString()
        })
      }

      if (connection === 'close') {
        isInitializing.delete(barberiaId)
        activeSockets.delete(barberiaId)
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
        console.log(`⚠️ Conexión cerrada para ID: ${barberiaId} (${statusCode})`)
      }
    })
  } catch (err: any) {
    isInitializing.delete(barberiaId)
    console.error('❌ Error inicializando socket:', err.message)
  }
}

setInterval(syncSessions, 3000)
syncSessions()