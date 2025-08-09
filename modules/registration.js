const { upsertUser, normalizePhone } = require('./sheets')

function parseRegistration(text) {
  const p = text.split('#').map(s => s.trim())
  return {
    name: p[0] || '',
    age: p[1] || '',
    gestation_weeks: p[2] || '',
    conditions: p[3] || '-',
    allergies: p[4] || '-',
    posyandu: p[5] || ''
  }
}

async function registerUser(jid, text) {
  const phone = normalizePhone(jid)
  const data = parseRegistration(text)
  data.phone = phone
  data.language = 'id'
  data.consent = 'yes'
  await upsertUser(data)
  return `Terima kasih ${data.name}, data Anda sudah tercatat.`
}

module.exports = { registerUser }