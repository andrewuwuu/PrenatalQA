const fs = require('fs')
const path = require('path')
const qa = fs.readFileSync(path.join(__dirname, 'qaPrompt.md'), 'utf8')

function safe(v, d='-'){ return (v == null || v === '') ? d : String(v) }

function buildMessages(profile = {}, userText) {
  const systemContent = `${qa}

[PROFIL]
Nama: ${safe(profile.name, 'Bunda')}
Usia: ${safe(profile.age, '?')}
Usia hamil (minggu): ${safe(profile.gestation_weeks, '?')}
Riwayat: ${safe(profile.conditions)}
Alergi: ${safe(profile.allergies)}
Posyandu: ${safe(profile.posyandu)}`

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: userText }
  ]
}

module.exports = { buildMessages }