# meal.mifan.im

餐食推荐前端（Next.js）+ 可更新后端（Node HTTP API）。

## Frontend Run

```bash
npm install
npm run dev
```

## Backend Run

```bash
MEAL_ADMIN_TOKEN=your-token npm run backend
```

默认后端监听 `:8788`，提供：
- `GET /api/health`
- `GET /api/meals?date=YYYY-MM-DD&city=shanghai&mealType=lunch`
- `POST /api/admin/upsert`（header: `x-api-token`）

## Vercel Deploy (Frontend)

前端可直接部署到 Vercel。API URL 参考 Daily 项目模式：
- `NEXT_PUBLIC_API_BASE_URL=/api`（默认走本项目 `/api/feed`）
- `NEXT_PUBLIC_API_BASE_URL=https://your-backend-host/api`（直连外部后端）

如果走本项目 `/api/feed` 代理，还需配置：
- `MEAL_BACKEND_URL=https://your-backend-host`
