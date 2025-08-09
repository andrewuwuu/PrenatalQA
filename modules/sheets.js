const fetch = (...a) => import('node-fetch').then(({default: f}) => f(...a))

function normalizePhone(jid) {
  return String(jid).replace(/@.*$/, '')
}

async function getUserByPhone(phone) {
  phone = normalizePhone(phone)
  const res = await fetch(process.env.SHEETS_API_URL)
  const { headers, rows } = await res.json()
  const idx = headers.indexOf('phone')
  for (const row of rows) {
    if (row[idx] === phone) {
      return Object.fromEntries(headers.map((h, i) => [h, row[i]]))
    }
  }
  return null
}

async function getAllUsers() {
  const res = await fetch(process.env.SHEETS_API_URL)
  const { headers, rows } = await res.json()
  return rows.map(r => Object.fromEntries(headers.map((h, i) => [h, r[i]])))
}

async function upsertUser(profile) {
  await fetch(process.env.SHEETS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  })
}

module.exports = { getUserByPhone, getAllUsers, upsertUser, normalizePhone }