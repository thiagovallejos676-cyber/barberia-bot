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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const PORT = process.env.PORT || 10000
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('BarberBot Engine Active 🚀')
}).listen(PORT, () => {
  console.log(`🌐 Servidor de Salud en puerto ${PORT}`)
})

const activeSockets = new Map<string, any>()
const isInitializing = new Set<string>()

async function syncSessions() {
  try {
    const { data: sessions } = await supabase.from('whatsapp_sessions').select('*')
    for (const session of sessions || []) {
      const barberiaId = session.barberia_id
      if ((session.status === 'INIT_REQUEST' || session.status === 'QR_READY') && !activeSockets.has(barberiaId) && !isInitializing.has(barberiaId)) {
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
        if (fs.existsSync(sessionFolder)) fs.rmSync(sessionFolder, { recursive: true, force: true })
        await supabase.from('whatsapp_sessions').update({ status: 'DISCONNECTED', qr_code: null, phone: null }).eq('barberia_id', barberiaId)
      }
    }
  } catch (err) { console.error(err) }
}

async function initBarberiaSession(barberiaId: string) {
  if (isInitializing.has(barberiaId)) return
  isInitializing.add(barberiaId)
  const sessionFolder = path.join(process.cwd(), 'whatsapp-bot', 'auth_sessions', `session_${barberiaId}`)
  if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder, { recursive: true })
  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder)
  const sock = makeWASocket({ auth: state, printQRInTerminal: false, logger: pino({ level: 'silent' }) })
  activeSockets.set(barberiaId, sock)
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update
    if (qr) {
      const qrDataUrl = await QRCode.toDataURL(qr)
      await supabase.from('whatsapp_sessions').upsert({ barberia_id: barberiaId, status: 'QR_READY', qr_code: qrDataUrl, updated_at: new Date().toISOString() })
    }
    if (connection === 'open') {
      isInitializing.delete(barberiaId)
      await supabase.from('whatsapp_sessions').upsert({ barberia_id: barberiaId, status: 'CONNECTED', qr_code: null, phone: `+${sock.user?.id.split(':')[0]}`, updated_at: new Date().toISOString() })
    }
    if (connection === 'close') {
      isInitializing.delete(barberiaId)
      activeSockets.delete(barberiaId)
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
      if (statusCode !== DisconnectReason.loggedOut) setTimeout(() => initBarberiaSession(barberiaId), 4000)
    }
  })
}

async function procesarRecordatorios() {
  const hoy = new Date().toISOString().split('T')[0]
  const { data: turnos } = await supabase.from('turnos').select('*, clientes(nombre, telefono), barberias(nombre)').eq('fecha', hoy).eq('estado', 'reservado').eq('recordatorio_enviado', false)
  for (const t of turnos || []) {
    const sock = activeSockets.get(t.barberia_id)
    if (sock) {
      let tel = t.clientes?.telefono?.replace(/[^0-9]/g, '')
      if (!tel) continue
      if (!tel.startsWith('54')) tel = '549' + tel
      const link = `${APP_URL}/cancelar/${t.token_cancelacion}`
      const msg = `🔔 *RECORDATORIO DE TURNO*\n\nHola *${t.clientes.nombre}*! 👋\nTenés un turno hoy en *${t.barberias.nombre}* a las *${t.hora_inicio.slice(0,5)} hs*.\n\n❌ ¿No podés ir? Cancelá acá: ${link}`
      await sock.sendMessage(`${tel}@s.whatsapp.net`, { text: msg })
      await supabase.from('turnos').update({ recordatorio_enviado: true }).eq('id', t.id)
    }
  }
}

setInterval(syncSessions, 5000)
setInterval(procesarRecordatorios, 10000)
syncSessions()
