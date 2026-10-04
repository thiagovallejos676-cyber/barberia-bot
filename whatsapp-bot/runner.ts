import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys'
import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'
import pino from 'pino'
import * as dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const activeSockets = new Map<string, any>()

// Servidor web mínimo para que el hosting gratuito no lo apague
import http from 'http'
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Bot Online')
})
server.listen(process.env.PORT || 8080)

console.log('🤖 MOTOR WHATSAPP CLOUD INICIADO')

async function syncSessions() {
  const { data: sessions } = await supabase.from('whatsapp_sessions').select('*')
  for (const session of sessions || []) {
    if (session.status !== 'DISCONNECTED' && !activeSockets.has(session.barberia_id)) {
      initSession(session.barberia_id)
    }
  }
}

async function initSession(id: string) {
  // En la nube usamos una carpeta temporal por ID
  const { state, saveCreds } = await useMultiFileAuthState(`./auth_${id}`)
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false
  })

  activeSockets.set(id, sock)
  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (up) => {
    const { connection, qr } = up
    if (qr) {
      const qrDataUrl = await QRCode.toDataURL(qr)
      await supabase.from('whatsapp_sessions').upsert({ barberia_id: id, status: 'QR_READY', qr_code: qrDataUrl })
    }
    if (connection === 'open') {
      await supabase.from('whatsapp_sessions').upsert({ barberia_id: id, status: 'CONNECTED', qr_code: null, phone: sock.user?.id.split(':')[0] })
      console.log(`🟢 Conectado: ${id}`)
    }
    if (connection === 'close') {
      activeSockets.delete(id)
      setTimeout(() => initSession(id), 5000)
    }
  })
}

setInterval(syncSessions, 5000)
// Aquí iría tu lógica de procesarRecordatorios() que ya tenemos...
syncSessions()