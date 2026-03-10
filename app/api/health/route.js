import { NextResponse } from 'next/server'

export function GET() {
  return NextResponse.json({
    ok: true,
    service: 'meal-frontend',
    backendConfigured: Boolean(process.env.MEAL_BACKEND_URL),
    timestamp: new Date().toISOString(),
  })
}
