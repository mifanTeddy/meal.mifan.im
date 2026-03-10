import http from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const dataFile = join(__dirname, 'data', 'meals.json')
const port = Number(process.env.PORT || 8788)
const apiToken = process.env.MEAL_ADMIN_TOKEN || ''

function send(res, code, payload) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-token',
  })
  res.end(JSON.stringify(payload))
}

async function loadData() {
  if (!existsSync(dataFile)) {
    return { version: 1, updatedAt: null, days: {} }
  }
  try {
    const raw = await readFile(dataFile, 'utf-8')
    const parsed = JSON.parse(raw)
    if (!parsed.days || typeof parsed.days !== 'object') parsed.days = {}
    return parsed
  } catch {
    return { version: 1, updatedAt: null, days: {} }
  }
}

async function saveData(data) {
  await writeFile(dataFile, `${JSON.stringify(data, null, 2)}\n`, 'utf-8')
}

function normalizeDate(input) {
  if (!input || typeof input !== 'string') return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null
  return input
}

function getItems(payload, date, city, mealType) {
  const day = payload.days?.[date]
  if (!day || !Array.isArray(day.items)) return []
  return day.items.filter((item) => {
    const cityMatch = !city || item.city === city
    const typeMatch = !mealType || item.mealType === mealType
    return cityMatch && typeMatch
  })
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`)

  if (req.method === 'OPTIONS') return send(res, 204, {})

  if (url.pathname === '/api/health' && req.method === 'GET') {
    return send(res, 200, { ok: true, service: 'meal-backend', timestamp: new Date().toISOString() })
  }

  if ((url.pathname === '/api/meals' || url.pathname === '/api/feed') && req.method === 'GET') {
    const date = normalizeDate(url.searchParams.get('date'))
    if (!date) return send(res, 400, { error: 'date is required (YYYY-MM-DD)' })
    const city = url.searchParams.get('city') || ''
    const mealType = url.searchParams.get('mealType') || ''
    const data = await loadData()
    const items = getItems(data, date, city, mealType)
    return send(res, 200, {
      date,
      city: city || null,
      mealType: mealType || null,
      total: items.length,
      items,
      updatedAt: data.updatedAt,
    })
  }

  if (url.pathname === '/api/admin/upsert' && req.method === 'POST') {
    if (!apiToken) return send(res, 500, { error: 'MEAL_ADMIN_TOKEN is not configured' })
    if ((req.headers['x-api-token'] || '') !== apiToken) return send(res, 401, { error: 'unauthorized' })

    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}')
        const date = normalizeDate(payload.date)
        const items = Array.isArray(payload.items) ? payload.items : null
        if (!date || !items) {
          return send(res, 400, { error: 'invalid payload: require date and items[]' })
        }

        const normalized = items
          .map((item) => ({
            city: typeof item.city === 'string' ? item.city : '',
            mealType: typeof item.mealType === 'string' ? item.mealType : '',
            name: typeof item.name === 'string' ? item.name : '',
            tags: Array.isArray(item.tags) ? item.tags.filter((t) => typeof t === 'string') : [],
            score: Number.isFinite(item.score) ? item.score : 0,
            source: typeof item.source === 'string' ? item.source : '',
          }))
          .filter((item) => item.city && item.mealType && item.name)

        const data = await loadData()
        data.days[date] = { items: normalized }
        data.updatedAt = new Date().toISOString()
        await saveData(data)
        return send(res, 200, { ok: true, date, count: normalized.length, updatedAt: data.updatedAt })
      } catch (error) {
        return send(res, 400, { error: `bad request: ${error.message}` })
      }
    })
    return
  }

  return send(res, 404, { error: 'not found' })
})

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`meal backend listening on :${port}`)
})
