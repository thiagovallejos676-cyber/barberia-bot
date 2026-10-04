import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys'
import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'
import pino from 'pino'
import http from 'http'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://barberia-saas.vercel.app'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 1. SERVIDOR HTTP PARA QUE RENDER DETECTE EL BOT COMO "LIVE"
const PORT = process.env.PORT || 10000
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('BarberBot Engine 24/7 Online 🚀')
}).listen(PORT, () => {
  console.log(`🌐 Servidor de Salud Activo escuchando en el puerto ${PORT}`)
})

// Mapeos en memoria
const activeSockets = new Map<string, any>()
const activeStatuses = new Map<string, boolean>()
const isInitializing = new Set<string>()

console.log('====================================================')
console.log('🤖 MOTOR MULTI-BOT CON PUERTO DE RENDER ACTIVADO')
console.log('====================================================\n')

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
        activeStatuses.set(barberiaId, false)
        isInitializing.delete(barberiaId)

        const sessionFolder = path.join(process.cwd(), 'whatsapp-bot', 'auth_sessions', `session_${barberiaId}`)
        if (fs.existsSync(sessionFolder)) {
          fs.rmSync(sessionFolder, { recursive: true, force: true })
        }

        await supabase.from('whatsapp_sessions').update({
          status: 'DISCONNECTED', qr_code: null, phone: null, updated_at: new Date().toISOString()
        }).eq('barberia_id', barberiaId)

        console.log(`🔌 [DESCONECTADO] Sesión eliminada para ID: ${barberiaId}`)
      }
    }
  } catch (err: any) {
    console.error('Error en syncSessions:', err.message)
  }
}

async function initBarberiaSession(barberiaId: string) {
  if (isInitializing.has(barberiaId)) return
  isInitializing.add(barberiaId)

  const { data: barberia } = await supabase.from('barberias').select('nombre').eq('id', barberiaId).single()
  const nombreLocal = barberia?.nombre || 'Barbería'

  console.log(`⚡ [INICIANDO QR] Generando sesión para: "${nombreLocal}"...`)

  const sessionFolder = path.join(process.cwd(), 'whatsapp-bot', 'auth_sessions', `session_${barberiaId}`)
  if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder, { recursive: true })

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
      console.log(`📸 [QR LISTO EN NUBE] Guardando imagen de QR para "${nombreLocal}"`)
      try {
        const qrDataUrl = await QRCode.toDataURL(qr)
        await supabase.from('whatsapp_sessions').upsert({
          barberia_id: barberiaId, status: 'QR_READY', qr_code: qrDataUrl, updated_at: new Date().toISOString()
        })
      } catch (e: any) {
        console.error('Error QR:', e.message)
      }
    }

    if (connection === 'open') {
      isInitializing.delete(barberiaId)
      activeSockets.set(barberiaId, sock)
      activeStatuses.set(barberiaId, true)

      const rawPhone = sock.user?.id?.split(':')[0] || ''
      console.log(`🟢 [CONECTADO EN LA NUBE] "${nombreLocal}" | Número: +${rawPhone}`)

      await supabase.from('whatsapp_sessions').upsert({
        barberia_id: barberiaId, status: 'CONNECTED', qr_code: null, phone: rawPhone ? `+${rawPhone}` : 'CONECTADO', updated_at: new Date().toISOString()
      })
    }

    if (connection === 'close') {
      isInitializing.delete(barberiaId)
      activeSockets.delete(barberiaId)
      activeStatuses.set(barberiaId, false)

      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
      if (statusCode === 440 || statusCode === 428 || statusCode === 401) {
        await supabase.from('whatsapp_sessions').upsert({
          barberia_id: barberiaId, status: 'DISCONNECTED', qr_code: null, phone: null, updated_at: new Date().toISOString()
        })
      } else {
        setTimeout(() => initBarberiaSession(barberiaId), 4000)
      }
    }
  })
}

async function procesarRecordatorios() {
  try {
    const hoy = new Date().toISOString().split('T')[0]

    const { data: turnos } = await supabase
      .from('turnos')
      .select('*, clientes(nombre, telefono), barberias(nombre), barberos(nombre), servicios(nombre)')
      .eq('fecha', hoy)
      .eq('estado', 'reservado')
      .eq('recordatorio_enviado', false)

    if (!turnos || turnos.length === 0) return

    for (const t of turnos as any[]) {
      const barberiaId = t.barberia_id
      const sock = activeSockets.get(barberiaId)
      const conectado = activeStatuses.get(barberiaId)

      if (sock && conectado) {
        let tel = t.clientes?.telefono?.replace(/[^0-9]/g, '') || ''
        if (!tel) continue
        if (!tel.startsWith('54')) tel = '549' + tel

        try {
          const [waUser] = await sock.onWhatsApp(tel)
          if (!waUser || !waUser.exists) continue

          const jid = waUser.jid
          const linkCancelar = `${APP_URL}/cancelar/${t.token_cancelacion}`

          const mensaje =
            `🔔 *RECORDATORIO DE TURNO*\n\n` +
            `Hola *${t.clientes?.nombre}*! 👋\n\n` +
            `Te recordamos tu turno para hoy:\n\n` +
            `🏪 *${t.barberias?.nombre}*\n` +
            `🕐 Hora: *${t.hora_inicio.slice(0,5)} hs*\n` +
            `✂️ Barbero: *${t.barberos?.nombre}*\n` +
            `💈 Servicio: *${t.servicios?.nombre}*\n\n` +
            `━━━━━━━━━━━━━━━━━━\n\n` +
            `⚠️ *¿No vas a poder asistir?*\n` +
            `Cancelá tu turno haciendo clic acá para liberar el cupo:\n` +
            `👉 ${linkCancelar}\n\n` +
            `¡Muchas gracias! 🙏`

          await sock.sendMessage(jid, { text: mensaje })
          await supabase.from('turnos').update({ recordatorio_enviado: true }).eq('id', t.id)

          console.log(`🎉 ¡ENVIADO A ${t.clientes?.nombre} DESDE "${t.barberias?.nombre}"!`)
        } catch (err: any) {
          console.error('Error enviando mensaje:', err.message)
        }
      }
    }
  } catch (err: any) {
    console.error('Error en loop:', err.message)
  }
}

setInterval(syncSessions, 3000)
setInterval(procesarRecordatorios, 5000)

syncSessions()