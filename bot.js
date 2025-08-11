const { registerUser } = require('./modules/registration')
const { startTipsScheduler } = require('./modules/tipsScheduler')
const { buildMessages } = require('./prompt/buildPrompt')
const { chat } = require('./openrouter')
const { getUserByPhone } = require('./modules/sheets')

const makeWASocket = require('@whiskeysockets/baileys').default
const {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers
} = require('@whiskeysockets/baileys')
const qrcode = require('qrcode-terminal')

/* ---------- anti-spam & concurrency guards ---------- */
const processed = new Map()                    // message.id -> ts
const processingLock = new Map()               // jid -> Promise chain
const PROCESSED_TTL_MS = 6 * 60 * 60 * 1000    // 6 jam
const APP_STARTED_AT = Date.now()
const sessionHasProfile = new Set()            // JID yang baru saja daftar (hindari "daftar dulu" dari event duplikat)

function seen(id) {
  const now = Date.now()
  if (processed.size > 5000) {
    for (const [k, t] of processed) if (now - t > PROCESSED_TTL_MS) processed.delete(k)
  }
  if (processed.has(id)) return true
  processed.set(id, now)
  return false
}

function runWithLock(jid, fn) {
  const prev = processingLock.get(jid) || Promise.resolve()
  const p = prev.finally(fn).catch(() => {})
  processingLock.set(jid, p)
  return p
}
/* ---------------------------------------------------- */

function extractText(msg) {
  if (!msg) return ''
  return (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.documentMessage?.caption ||
    ''
  ).trim()
}

// regex registrasi yang ketat: NAMA#UMUR#USIA_HAMIL#(opsional...) maksimal 6 bagian
const REGEX_REGISTER = /^[^\n#]+#[0-9]{1,3}#[0-9]{1,3}(#[^#\n]*){0,3}$/i
const IS_BOT_TEMPLATE = /Halo Bunda! Untuk mulai, daftar dulu/i

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    auth: state,
    version,
    browser: Browsers.macOS('Chrome'),
    markOnlineOnConnect: false
  })

  // QR & koneksi
  sock.ev.on('connection.update', ({ qr, connection, lastDisconnect }) => {
    if (qr) {
      console.log('📌 Scan QR berikut untuk login WhatsApp:')
      qrcode.generate(qr, { small: true })
    }
    if (connection === 'open') console.log('✅ Bot terhubung ke WhatsApp')
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      console.log('⚠️ Koneksi terputus', statusCode, lastDisconnect?.error?.message || '')
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut
      if (shouldReconnect) setTimeout(() => startBot(), 1500)
      else console.log('🔒 Sesi logout. Hapus folder ./auth untuk pairing ulang.')
    }
  })

  sock.ev.on('creds.update', saveCreds)

  // Scheduler: tips harian & increment mingguan
  startTipsScheduler(sock)

  // Handler pesan masuk (dedup + filter history)
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    // hanya proses pesan baru, bukan sync/append/replay
    if (type !== 'notify') return

    for (const m of messages) {
      const jid = m.key.remoteJid
      if (!jid) continue
      if (jid === 'status@broadcast' || jid.endsWith('@newsletter')) continue // skip status/newsletter
      if (jid.endsWith('@g.us')) continue                                    // skip grup
      if (m.key.fromMe) continue                                             // jangan balas pesan kita sendiri
      if (!m.message || m.message.protocolMessage) continue                  // skip event khusus (revoke, etc)

      // tolak history replay (pesan lebih tua dari waktu start - 60 detik)
      const tsMs = Number(m.messageTimestamp) * 1000
      if (tsMs && tsMs < APP_STARTED_AT - 60_000) continue

      // de-dup per message id
      const msgId = m.key.id || `${jid}-${m.messageTimestamp}`
      if (seen(msgId)) continue

      // serialisasikan per JID biar tidak balapan
      runWithLock(jid, async () => {
        const body = extractText(m.message)
        if (!body) return

        try {
          // Pendaftaran: NAMA#UMUR#USIA_HAMIL#PENYAKIT#ALERGI#POSYANDU
          const isRegister = REGEX_REGISTER.test(body) && !IS_BOT_TEMPLATE.test(body)
          if (isRegister) {
            console.log('[REGISTER]', jid, '=>', body)
            const reply = await registerUser(jid, body)
            sessionHasProfile.add(jid) // tandai agar event duplikat tidak memicu "daftar dulu"
            await sock.sendMessage(jid, { text: reply })
            // beri jeda kecil agar Apps Script commit & hindari langsung lanjut ke Q&A
            await new Promise(r => setTimeout(r, 500))
            return
          }

          // Tanya-jawab
          let profile = null
          if (sessionHasProfile.has(jid)) {
            // baru saja daftar pada sesi ini — hindari prompt "daftar dulu"
            profile = await getUserByPhone(jid) || { name: 'Bunda' }
          } else {
            profile = await getUserByPhone(jid)
          }

          // 🔎 LOG PROFIL — letakkan tepat sebelum build prompt
          console.log('[PROFILE]', jid, profile?.phone, profile?.name, profile?.gestation_weeks)

          if (profile) {
            const messagesPrompt = buildMessages(profile, body)
            const answer = await chat(messagesPrompt)
            await sock.sendMessage(jid, { text: answer || 'Maaf, terjadi kendala. Coba lagi ya, Bunda.' })
          } else {
            await sock.sendMessage(jid, {
              text:
                'Halo Bunda! Untuk mulai, daftar dulu ya dengan format:\n' +
                '*NAMA#UMUR#USIA_HAMIL#PENYAKIT(opsional)#ALERGI(opsional)#NAMA_POSYANDU*'
            })
          }
        } catch (e) {
          console.error('Message handler error:', e)
          await sock.sendMessage(jid, { text: 'Maaf, ada kendala teknis. Coba lagi nanti ya, Bunda.' })
        }
      })
    }
  })
}

module.exports = { startBot }