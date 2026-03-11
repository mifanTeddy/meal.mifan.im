import { NextResponse } from 'next/server'

const DEFAULT_BACKEND_URL = 'https://meal-api.clawrun-test.app'
const CITY_ALIAS = {
  shanghai: '上海',
  beijing: '北京',
  hangzhou: '杭州',
  shenzhen: '深圳',
  guangzhou: '广州',
  chengdu: '成都',
  wuhan: '武汉',
  xian: '西安',
}

function normalizeBase(url) {
  if (!url) return null
  return url.endsWith('/') ? url.slice(0, -1) : url
}

function normalizeCity(city) {
  if (!city) return ''
  const raw = city.trim()
  if (!raw) return ''
  const key = raw.toLowerCase()
  return CITY_ALIAS[key] || raw
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') || ''
  const city = normalizeCity(searchParams.get('city') || '')
  const mealType = searchParams.get('mealType') || ''

  const base = normalizeBase(process.env.MEAL_BACKEND_URL || process.env.MEAL_API_BASE_URL || DEFAULT_BACKEND_URL)
  if (!base) {
    return NextResponse.json({
      date,
      city: city || null,
      mealType: mealType || null,
      total: 0,
      items: [],
      updatedAt: null,
      backendConfigured: false,
    })
  }

  const url = new URL(`${base}/api/feed`)
  if (date) url.searchParams.set('date', date)
  if (city) url.searchParams.set('city', city)
  if (mealType) url.searchParams.set('mealType', mealType)

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
    const payload = await res.json()
    return NextResponse.json({ ...payload, backendConfigured: true }, { status: res.status })
  } catch {
    return NextResponse.json({
      date,
      city: city || null,
      mealType: mealType || null,
      total: 0,
      items: [],
      updatedAt: null,
      backendConfigured: true,
      error: 'backend_unreachable',
    }, { status: 502 })
  }
}
