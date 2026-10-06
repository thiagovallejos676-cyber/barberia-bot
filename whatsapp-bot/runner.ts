import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys'
import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'
import pino from 'pino'
import http from 'http'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://barberia-saas.vercel.app'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const AUTH_BUCKET = 'whatsapp-sessions'

async function restaurarSesion(barberiaId: string, sessionFolder: string) {
  if (!fs.existsSync(sessionFolder)) {
    fs.mkdirSync(sessionFolder, { recursive: true })
  }

  const { data: archivos, error } = await supabase.storage
    .from(AUTH_BUCKET)
    .list(barberiaId, { limit: 1000 })

  if (error) throw error

  for (const archivo of archivos || []) {
    if (!archivo.name) continue

    const { data, error: downloadError } = await supabase.storage
      .from(AUTH_BUCKET)
      .download(`${barberiaId}/${archivo.name}`)

    if (downloadError) throw downloadError

    const buffer = Buffer.from(await data.arrayBuffer())
    fs.writeFileSync(path.join(sessionFolder, archivo.name), buffer)
  }
}

async function guardarSesion(barberiaId: string, sessionFolder: string) {
  if (!fs.existsSync(sessionFolder)) return

  const archivosLocales = fs.readdirSync(sessionFolder)
    .filter(nombre =>
      fs.statSync(path.join(sessionFolder, nombre)).isFile()
    )

  for (const nombre of archivosLocales) {
    const rutaArchivo = path.join(sessionFolder, nombre)
    if (!fs.existsSync(rutaArchivo)) continue
    const contenido = fs.readFileSync(rutaArchivo)

    const { error } = await supabase.storage
      .from(AUTH_BUCKET)
      .upload(
        `${barberiaId}/${nombre}`,
        contenido,
        {
          upsert: true,
          contentType: 'application/json'
        }
      )

    if (error) throw error
  }
}

async function borrarSesionGuardada(barberiaId: string) {
  const { data: archivos, error } = await supabase.storage
    .from(AUTH_BUCKET)
    .list(barberiaId, { limit: 1000 })

  if (error) throw error
  if (!archivos?.length) return

  const rutas = archivos
    .filter(a => a.name)
    .map(a => `${barberiaId}/${a.name}`)

  if (rutas.length) {
    const { error: removeError } = await supabase.storage
      .from(AUTH_BUCKET)
      .remove(rutas)

    if (removeError) throw removeError
  }
}


const activeSockets = new Map<string, any>()
const activeStatuses = new Map<string, boolean>()
const isInitializing = new Set<string>()

// SERVIDORES HTTP: Al recibir cualquier ping HTTP desde Vercel, ejecuta syncSessions() de inmediato
const PORT = process.env.PORT || 10000
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  syncSessions().catch(() => {})
  res.end(JSON.stringify({ status: 'online', bot: 'active' }))
}).listen(PORT, () => {
  console.log(`ðŸŒ Servidor de Salud/Despertador escuchando en puerto ${PORT}`)
})

console.log('ðŸ¤– [BOT ENGINE] Escaneando solicitudes...')

async function syncSessions() {
  try {
    const { data: sessions } = await supabase.from('whatsapp_sessions').select('*')

    for (const session of sessions || []) {
      const barberiaId = session.barberia_id

      if ((session.status === 'INIT_REQUEST' || session.status === 'QR_READY' || session.status === 'CONNECTED') && !activeSockets.has(barberiaId) && !isInitializing.has(barberiaId)) {
        console.log(`âš¡ Procesando solicitud para BarberÃ­a ID: ${barberiaId}`)
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

        const sessionFolder = path.join(__dirname, 'auth_sessions', `session_${barberiaId}`)
        if (fs.existsSync(sessionFolder)) {
          fs.rmSync(sessionFolder, { recursive: true, force: true })
        }

        // Borrar tambien la sesion persistente de Supabase
        try {
          await borrarSesionGuardada(barberiaId)
          console.log(`Sesion eliminada de Supabase: ${barberiaId}`)
        } catch (error) {
          console.error(`Error eliminando sesion de Supabase ${barberiaId}:`, error)
        }

        await supabase.from('whatsapp_sessions').update({
          status: 'DISCONNECTED', qr_code: null, phone: null, updated_at: new Date().toISOString()
        }).eq('barberia_id', barberiaId)
      }
    }
  } catch (err: any) {
    console.error('Error en syncSessions:', err.message)
  }
}

async function initBarberiaSession(barberiaId: string) {
  if (isInitializing.has(barberiaId)) return
  isInitializing.add(barberiaId)

  const sessionFolder = path.join(__dirname, 'auth_sessions', `session_${barberiaId}`)
  if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder, { recursive: true })

  // Restaurar la sesion guardada en Supabase antes de iniciar WhatsApp
  try {
    await restaurarSesion(barberiaId, sessionFolder)
    console.log(`Sesion restaurada desde Supabase: ${barberiaId}`)
  } catch (error) {
    console.error(`Error restaurando sesion ${barberiaId}:`, error)
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder)

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' })
  })

  activeSockets.set(barberiaId, sock)
  sock.ev.on('creds.update', async () => {
    try {
      await saveCreds()
      await guardarSesion(barberiaId, sessionFolder)
      console.log(`Sesion guardada en Supabase: ${barberiaId}`)
    } catch (error) {
      console.error(`Error guardando sesion ${barberiaId}:`, error)
    }
  })

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      console.log(`ðŸ“¸ [QR LISTO] Generando imagen para barberÃ­a ID: ${barberiaId}`)
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
      console.log(`ðŸŸ¢ [CONECTADO] Local: ${barberiaId} | NÃºmero: +${rawPhone}`)

      await supabase.from('whatsapp_sessions').upsert({
        barberia_id: barberiaId, status: 'CONNECTED', qr_code: null, phone: rawPhone ? `+${rawPhone}` : 'CONECTADO', updated_at: new Date().toISOString()
      })
    }

    if (connection === 'close') {
      isInitializing.delete(barberiaId)
      activeSockets.delete(barberiaId)
      activeStatuses.set(barberiaId, false)
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
      if (statusCode !== DisconnectReason.loggedOut) {
        setTimeout(() => initBarberiaSession(barberiaId), 3000)
      }
    }
  })
}

async function procesarRecordatorios() {
  try {
    const ahoraArgentina = new Date(
      new Date().toLocaleString('en-US', {
        timeZone: 'America/Argentina/Buenos_Aires'
      })
    )

    const hoy =
      ahoraArgentina.getFullYear() + '-' +
      String(ahoraArgentina.getMonth() + 1).padStart(2, '0') + '-' +
      String(ahoraArgentina.getDate()).padStart(2, '0')

    const { data: turnos } = await supabase
      .from('turnos')
      .select('*, clientes(nombre, telefono), barberias(nombre), barberos(nombre), servicios(nombre)')
      .eq('fecha', hoy)
      .eq('estado', 'reservado')
      .or('recordatorio_enviado.eq.false,recordatorio_enviado.is.null')

    if (!turnos || turnos.length === 0) return

    for (const t of turnos as any[]) {
      const [hora, minuto] = t.hora_inicio.slice(0, 5).split(':').map(Number)
      const fechaTurno = new Date(ahoraArgentina)
      fechaTurno.setHours(hora, minuto, 0, 0)

      const minutosFaltantes =
        (fechaTurno.getTime() - ahoraArgentina.getTime()) / 60000

      // Si el turno ya pas?, no enviar nada.
      if (minutosFaltantes <= 0) {
        continue
      }

      // Si todavia faltan 2 horas o menos y el recordatorio
      // sigue pendiente, enviarlo. Esto permite recuperar mensajes
      // aunque Render haya estado dormido cuando se cumplieron las 2 horas.
      const debeEnviarRecordatorio =
        minutosFaltantes > 0 && minutosFaltantes <= 120

      if (!debeEnviarRecordatorio) {
        continue
      }

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
            `ðŸ”” *RECORDATORIO DE TURNO*\n\n` +
            `Hola *${t.clientes?.nombre}*! ðŸ‘‹\n\n` +
            `Te recordamos tu turno para hoy:\n\n` +
            `ðŸª *${t.barberias?.nombre}*\n` +
            `ðŸ• Hora: *${t.hora_inicio.slice(0,5)} hs*\n` +
            `âœ‚ï¸ Barbero: *${t.barberos?.nombre}*\n` +
            `ðŸ’ˆ Servicio: *${t.servicios?.nombre}*\n\n` +
            `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n\n` +
            `âš ï¸ *Â¿No vas a poder asistir?*\n` +
            `CancelÃ¡ tu turno haciendo clic acÃ¡ para liberar el cupo:\n` +
            `ðŸ‘‰ ${linkCancelar}\n\n` +
            `Â¡Muchas gracias! ðŸ™`

          await sock.sendMessage(jid, { text: mensaje })
          await supabase.from('turnos').update({ recordatorio_enviado: true }).eq('id', t.id)
          console.log(`ðŸŽ‰ Â¡ENVIADO A ${t.clientes?.nombre}!`)
        } catch (err: any) {
          console.error('Error enviando:', err.message)
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
