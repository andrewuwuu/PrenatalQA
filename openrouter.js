const fetch = (...a) => import('node-fetch').then(({default: f}) => f(...a))

async function chat(messages) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      messages,
      temperature: 0.4
    })
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

module.exports = { chat }