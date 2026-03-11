'use client'

import { useState } from 'react'
import { fetchFeed } from './lib/client-api'

function todayInShanghai() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date())
}

function shiftDate(value, deltaDays) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + deltaDays)
  return date.toISOString().slice(0, 10)
}

function randomPick(list) {
  if (!list.length) return null
  const total = list.reduce((sum, item) => sum + (Number(item.score) > 0 ? Number(item.score) : 1), 0)
  let threshold = Math.random() * total
  for (const item of list) {
    threshold -= Number(item.score) > 0 ? Number(item.score) : 1
    if (threshold <= 0) return item
  }
  return list[list.length - 1]
}

export default function Page() {
  const [date, setDate] = useState(todayInShanghai())
  const [city, setCity] = useState('shanghai')
  const [mealType, setMealType] = useState('lunch')
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])
  const [updatedAt, setUpdatedAt] = useState(null)
  const [picked, setPicked] = useState(null)
  const [note, setNote] = useState('')

  const hasData = items.length > 0

  async function loadMeals() {
    setLoading(true)
    setNote('')
    setPicked(null)
    try {
      let payload = await fetchFeed({ date, city, mealType })
      const noData = Array.isArray(payload.items) && payload.items.length === 0
      if (noData) {
        const fallbackDate = shiftDate(date, -1)
        if (fallbackDate !== date) {
          const fallbackPayload = await fetchFeed({ date: fallbackDate, city, mealType })
          if (Array.isArray(fallbackPayload.items) && fallbackPayload.items.length > 0) {
            payload = fallbackPayload
            setDate(fallbackDate)
            setNote(`已切换到最近可用日期：${fallbackDate}`)
          }
        }
      }
      setItems(Array.isArray(payload.items) ? payload.items : [])
      setUpdatedAt(payload.updatedAt || null)
      if (payload.backendConfigured === false) {
        setNote('后端未配置：请在 Vercel 配置 MEAL_BACKEND_URL。')
      } else if (payload.error === 'backend_unreachable') {
        setNote('后端暂时不可达，请稍后重试。')
      } else if (!Array.isArray(payload.items) || payload.items.length === 0) {
        setNote('当前筛选条件暂无数据。')
      }
    } catch {
      setItems([])
      setUpdatedAt(null)
      setNote('请求失败，请重试。')
    } finally {
      setLoading(false)
    }
  }

  function pickOne() {
    const next = randomPick(items)
    setPicked(next)
  }

  return (
    <main className="page">
      <header>
        <span className="kicker">Meal Finder</span>
        <h1>今天吃什么</h1>
      </header>

      <section className="card">
        <div className="filters">
          <label>
            日期
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            城市
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="shanghai">Shanghai</option>
              <option value="beijing">Beijing</option>
              <option value="hangzhou">Hangzhou</option>
              <option value="shenzhen">Shenzhen</option>
            </select>
          </label>
          <label>
            餐别
            <select value={mealType} onChange={(e) => setMealType(e.target.value)}>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="night">Night</option>
            </select>
          </label>
          <label>
            数据状态
            <input value={updatedAt || 'not loaded'} readOnly />
          </label>
        </div>

        <div className="actions">
          <button className="primary" onClick={loadMeals} type="button" disabled={loading}>{loading ? '加载中...' : '加载推荐池'}</button>
          <button onClick={pickOne} type="button" disabled={!hasData}>随机抽一份</button>
        </div>

        {picked ? (
          <div className="picked">
            <strong>本次推荐：{picked.name}</strong>
            <div className="meta">{picked.city} · {picked.mealType} · score {picked.score || 1}</div>
            {picked.source ? <div className="meta">来源：{picked.source}</div> : null}
          </div>
        ) : null}

        <div className="items">
          {items.map((item, index) => (
            <div className="item" key={`${item.name}-${index}`}>
              <strong>{item.name}</strong>
              <div className="meta">{item.city} · {item.mealType} · score {item.score || 1}</div>
              {Array.isArray(item.tags) && item.tags.length ? <div className="meta">{item.tags.join(' / ')}</div> : null}
              {item.source ? <div className="meta">来源：{item.source}</div> : null}
            </div>
          ))}
        </div>

        {note ? <div className="note">{note}</div> : null}
      </section>
    </main>
  )
}
