const fs = require('fs')
const path = require('path')

function buildMessages(profile, userText) {
  const qaPrompt = fs.readFileSync(path.join(__dirname, 'qaPrompt.md'), 'utf8')
  const systemContent = qaPrompt + `\n\n[PROFIL]\nNama: ${profile.name}\nUsia: ${profile.age}\nUsia hamil: ${profile.gestation_weeks}\nRiwayat: ${profile.conditions}\nAlergi: ${profile.allergies}\nPosyandu: ${profile.posyandu}`
  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: userText }
  ]
}

module.exports = { buildMessages }