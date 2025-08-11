const fetch = (...a) => import('node-fetch').then(({default: f}) => f(...a))

// HAPUS semua suffix device & domain, contoh: 628xx:1@s.whatsapp.net -> 628xx
function normalizePhone(jidOrPhone) {
  return String(jidOrPhone).replace(/[:@].*$/, '')
}

// helper: buat peta header -> index, tidak sensitif kapitalisasi
function headerIndexMap(headers = []) {
  const map = {}
  headers.forEach((h, i) => map[String(h).trim().toLowerCase()] = i)
  return map
}

async function getUserByPhone(phone) {
  phone = normalizePhone(phone)
  // cache buster agar tidak dapat snapshot lama
  const url = `${process.env.SHEETS_API_URL}?t=${Date.now()}`
  const res = await fetch(url)
  const { headers = [], rows = [] } = await res.json()
  const idx = headerIndexMap(headers)
  const pCol = idx['phone']
  if (pCol == null) return null
  for (const row of rows) {
    if (String(row[pCol] || '') === phone) {
      const obj = {}
      for (const [name, i] of Object.entries(idx)) obj[name] = row[i]
      return obj
    }
  }
  return null
}

async function getAllUsers() {
  const url = `${process.env.SHEETS_API_URL}?t=${Date.now()}`
  const res = await fetch(url)
  const { headers = [], rows = [] } = await res.json()
  const idx = headerIndexMap(headers)
  return rows.map(r => {
    const o = {}
    for (const [name, i] of Object.entries(idx)) o[name] = r[i]
    return o
  })
}

async function upsertUser(profile) {
  profile.phone = normalizePhone(profile.phone)
  await fetch(process.env.SHEETS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  })
}

module.exports = { getUserByPhone, getAllUsers, upsertUser, normalizePhone }
