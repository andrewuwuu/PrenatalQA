const cron = require('node-cron')
const { getAllUsers } = require('./sheets')
const { chat } = require('../openrouter')
const fs = require('fs')
const path = require('path')
const fetch = (...a) => import('node-fetch').then(({ default: f }) => f(...a))

const tipsPrompt = fs.readFileSync(path.join(__dirname, '../prompt/tipsPrompt.md'), 'utf8')

function startTipsScheduler(sock) {
  // Tips harian setiap jam 06.00 WIB
  cron.schedule('0 6 * * *', async () => {
    const users = await getAllUsers()
    for (const u of users) {
      const messages = [
        { role: 'system', content: tipsPrompt + `\n\n[PROFIL]\nNama: ${u.name}\nUsia: ${u.age}\nUsia hamil: ${u.gestation_weeks}\nRiwayat: ${u.conditions}\nAlergi: ${u.allergies}\nPosyandu: ${u.posyandu}` },
        { role: 'user', content: 'Buatkan tips kesehatan pagi ini.' }
      ]
      const tip = await chat(messages)
      await sock.sendMessage(`${u.phone}@s.whatsapp.net`, { text: tip })
    }
  }, { timezone: 'Asia/Jakarta' })

  // Increment mingguan + ucapan selamat
  cron.schedule('0 6 * * 1', async () => {
    if (process.env.SHEETS_INCREMENT_URL) {
      await fetch(process.env.SHEETS_INCREMENT_URL)
    }
    const users = await getAllUsers()
    for (const u of users) {
      await sock.sendMessage(`${u.phone}@s.whatsapp.net`, {
        text: `Selamat Bunda! Kehamilan Anda kini memasuki minggu ke-${u.gestation_weeks}. Tetap semangat dan jaga kesehatan ya ❤️`
      })
    }
  }, { timezone: 'Asia/Jakarta' })
}

module.exports = { startTipsScheduler }