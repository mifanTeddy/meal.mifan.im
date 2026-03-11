const DEFAULT_BASE = '/api'
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, '')

function buildUrl(path, query) {
  const suffix = query ? `?${query.toString()}` : ''
  return `${API_BASE}${path}${suffix}`
}

async function request(url) {
  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
  })

  const payload = await response.json()
  if (!response.ok) {
    return payload
  }
  return payload
}

export function fetchFeed({ date, city, mealType }) {
  const query = new URLSearchParams()
  if (date) query.set('date', date)
  if (city) query.set('city', city)
  if (mealType) query.set('mealType', mealType)
  return request(buildUrl('/feed', query))
}
