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

前端可直接部署到 Vercel。若要读取独立后端，请在 Vercel 配置：
- `MEAL_BACKEND_URL=https://your-backend-host`
