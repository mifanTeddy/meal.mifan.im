import { NextResponse } from 'next/server'

function normalizeBase(url) {
  if (!url) return null
  return url.endsWith('/') ? url.slice(0, -1) : url
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') || ''
  const city = searchParams.get('city') || ''
  const mealType = searchParams.get('mealType') || ''

  const base = normalizeBase(process.env.MEAL_BACKEND_URL)
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

  const url = new URL(`${base}/api/meals`)
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
