import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_whatsapp')
  const sock = makeWASocket({ auth: state, printQRInTerminal: true })

  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut
      if (shouldReconnect) startBot()
    } else if (connection === 'open') {
      console.log('✅ Bot de WhatsApp listo y vinculado!')
      iniciarLoopRecordatorios(sock)
    }
  })
}

function iniciarLoopRecordatorios(sock: any) {
  setInterval(async () => {
    const ahora = new Date()
    const hoy = ahora.toISOString().split('T')[0]
    
    // Buscar turnos de hoy que falten ~2 horas y no tengan recordatorio enviado
    const { data: turnos } = await supabase
      .from('turnos')
      .select('*, clientes(nombre, telefono), barberias(nombre), barberos(nombre), servicios(nombre)')
      .eq('fecha', hoy)
      .eq('estado', 'reservado')
      .eq('recordatorio_enviado', false)

    for (const t of turnos || []) {
      const linkCancelar = `${APP_URL}/cancelar/${t.token_cancelacion}`
      const mensaje = `🔔 *RECORDATORIO DE TURNO*\n\n` +
        `Hola *${t.clientes.nombre}* 👋\n\n` +
        `Te recordamos tu turno para hoy:\n` +
        `🏪 *${t.barberias.nombre}*\n` +
        `🕐 Hora: *${t.hora_inicio.slice(0,5)} hs*\n` +
        `✂️ Barbero: *${t.barberos.nombre}*\n` +
        `💈 Servicio: *${t.servicios.nombre}*\n\n` +
        `⚠️ ¿Surgió un imprevisto? Podés cancelar tu turno haciendo clic acá para liberar el cupo:\n` +
        `👉 ${linkCancelar}`

      try {
        const jid = `${t.clientes.telefono}@s.whatsapp.net`
        await sock.sendMessage(jid, { text: mensaje })
        await supabase.from('turnos').update({ recordatorio_enviado: true }).eq('id', t.id)
        console.log(`📤 Recordatorio enviado a ${t.clientes.nombre}`)
      } catch (err) {
        console.error(`Error enviando WhatsApp a ${t.clientes.telefono}:`, err)
      }
    }
  }, 60000) // Revisa cada 1 minuto
}

startBot()