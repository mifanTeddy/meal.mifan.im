'use client'

import { useMemo, useState } from 'react'
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

function randomPickMany(list, count) {
  const pool = [...list]
  const result = []
  const limit = Math.min(count, pool.length)
  while (result.length < limit) {
    const picked = randomPick(pool)
    if (!picked) break
    result.push(picked)
    const index = pool.indexOf(picked)
    if (index >= 0) pool.splice(index, 1)
  }
  return result
}

const MEAL_TYPE_LABEL = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  night: '夜宵',
}

function mealTypeLabel(value) {
  return MEAL_TYPE_LABEL[value] || value || '未知'
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

export default function Page() {
  const [city, setCity] = useState('')
  const [mealType, setMealType] = useState('')
  const [tag, setTag] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])
  const [loadedDate, setLoadedDate] = useState('')
  const [picked, setPicked] = useState(null)
  const [pickedMany, setPickedMany] = useState([])
  const [note, setNote] = useState('')

  const cityOptions = useMemo(() => {
    const values = Array.from(new Set(items.map((item) => item.city).filter(Boolean)))
    values.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
    return values
  }, [items])

  const mealTypeOptions = useMemo(() => {
    const values = Array.from(new Set(items.map((item) => item.mealType).filter(Boolean)))
    const order = ['breakfast', 'lunch', 'dinner', 'night']
    values.sort((a, b) => {
      const ai = order.indexOf(a)
      const bi = order.indexOf(b)
      if (ai >= 0 && bi >= 0) return ai - bi
      if (ai >= 0) return -1
      if (bi >= 0) return 1
      return a.localeCompare(b, 'zh-Hans-CN')
    })
    return values
  }, [items])

  const tagOptions = useMemo(() => {
    const values = Array.from(new Set(items.flatMap((item) => (Array.isArray(item.tags) ? item.tags : [])).filter(Boolean)))
    values.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
    return values
  }, [items])

  const filteredItems = useMemo(() => {
    const key = normalizeText(query)
    return items.filter((item) => {
      const cityMatch = !city || item.city === city
      const mealMatch = !mealType || item.mealType === mealType
      const tagMatch = !tag || (Array.isArray(item.tags) && item.tags.includes(tag))
      if (!cityMatch || !mealMatch || !tagMatch) return false
      if (!key) return true
      const haystack = normalizeText(
        `${item.name} ${item.city} ${item.mealType} ${item.source || ''} ${(item.tags || []).join(' ')}`,
      )
      return haystack.includes(key)
    })
  }, [items, city, mealType, tag, query])

  const hasData = filteredItems.length > 0

  async function loadMeals() {
    setLoading(true)
    setNote('')
    setPicked(null)
    setPickedMany([])
    try {
      const startDate = todayInShanghai()
      let payload = null
      let fallbackDate = ''
      for (let i = 0; i < 14; i += 1) {
        const targetDate = shiftDate(startDate, -i)
        const candidate = await fetchFeed({ date: targetDate })
        payload = candidate
        if (candidate.backendConfigured === false || candidate.error === 'backend_unreachable') {
          break
        }
        if (Array.isArray(candidate.items) && candidate.items.length > 0) {
          if (i > 0) fallbackDate = targetDate
          break
        }
      }

      if (!payload) payload = { items: [], updatedAt: null, date: startDate }
      setItems(Array.isArray(payload.items) ? payload.items : [])
      setLoadedDate(payload.date || '')
      if (payload.backendConfigured === false) {
        setNote('后端未配置：请在 Vercel 配置 MEAL_BACKEND_URL。')
      } else if (payload.error === 'backend_unreachable') {
        setNote('后端暂时不可达，请稍后重试。')
      } else if (fallbackDate) {
        setNote(`已切换到最近可用日期：${fallbackDate}。可通过城市/餐别/标签继续筛选。`)
      } else if (!Array.isArray(payload.items) || payload.items.length === 0) {
        setNote('当前筛选条件暂无数据。')
      }
    } catch {
      setItems([])
      setLoadedDate('')
      setNote('请求失败，请重试。')
    } finally {
      setLoading(false)
    }
  }

  function pickOne() {
    const next = randomPick(filteredItems)
    setPicked(next)
    setPickedMany([])
  }

  function pickThree() {
    const next = randomPickMany(filteredItems, 3)
    setPickedMany(next)
    setPicked(null)
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
            城市
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">全部城市</option>
              {cityOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
          <label>
            餐别
            <select value={mealType} onChange={(e) => setMealType(e.target.value)}>
              <option value="">全部餐别</option>
              {mealTypeOptions.map((name) => (
                <option key={name} value={name}>{mealTypeLabel(name)}</option>
              ))}
            </select>
          </label>
          <label>
            标签
            <select value={tag} onChange={(e) => setTag(e.target.value)}>
              <option value="">全部标签</option>
              {tagOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
          <label>
            搜索
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="按菜名/城市/标签搜索"
            />
          </label>
        </div>

        <div className="meta-row">
          <span>推荐池：{items.length}</span>
          <span>当前筛选：{filteredItems.length}</span>
          {loadedDate ? <span>当前数据日期：{loadedDate}</span> : null}
        </div>

        <div className="actions">
          <button className="primary" onClick={loadMeals} type="button" disabled={loading}>{loading ? '加载中...' : '加载推荐池'}</button>
          <button onClick={pickOne} type="button" disabled={!hasData}>随机抽一份</button>
          <button onClick={pickThree} type="button" disabled={!hasData}>随机抽三份</button>
        </div>

        {picked ? (
          <div className="picked">
            <strong>本次推荐：{picked.name}</strong>
            <div className="meta">{picked.city} · {mealTypeLabel(picked.mealType)} · score {picked.score || 1}</div>
            {picked.source ? <div className="meta">来源：{picked.source}</div> : null}
            {Array.isArray(picked.tags) && picked.tags.length ? (
              <div className="tag-row">
                {picked.tags.map((tagName) => (
                  <button key={tagName} type="button" className="tag-btn" onClick={() => setTag(tagName)}>{tagName}</button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {pickedMany.length ? (
          <div className="picked-grid">
            {pickedMany.map((item, idx) => (
              <div className="picked" key={`${item.name}-${idx}`}>
                <strong>推荐 {idx + 1}：{item.name}</strong>
                <div className="meta">{item.city} · {mealTypeLabel(item.mealType)} · score {item.score || 1}</div>
                {Array.isArray(item.tags) && item.tags.length ? (
                  <div className="tag-row">
                    {item.tags.map((tagName) => (
                      <button key={tagName} type="button" className="tag-btn" onClick={() => setTag(tagName)}>{tagName}</button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        <div className="items">
          {filteredItems.map((item, index) => (
            <div className="item" key={`${item.name}-${index}`}>
              <strong>{item.name}</strong>
              <div className="meta">{item.city} · {mealTypeLabel(item.mealType)} · score {item.score || 1}</div>
              {Array.isArray(item.tags) && item.tags.length ? (
                <div className="tag-row">
                  {item.tags.map((tagName) => (
                    <button key={tagName} type="button" className="tag-btn" onClick={() => setTag(tagName)}>{tagName}</button>
                  ))}
                </div>
              ) : null}
              {item.source ? <div className="meta">来源：{item.source}</div> : null}
            </div>
          ))}
        </div>

        {note ? <div className="note">{note}</div> : null}
      </section>
    </main>
  )
}
