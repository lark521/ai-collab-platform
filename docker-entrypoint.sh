#!/bin/sh
set -e

echo "🚀 Starting AI Collab Platform..."

# 等待数据库就绪
echo "⏳ Waiting for PostgreSQL..."
until pg_isready -h db -p 5432 -U postgres; do
  sleep 1
done
echo "✅ PostgreSQL ready"

# 运行数据库迁移
echo "📦 Running database migrations..."
cd /app/backend
npx prisma migrate deploy 2>/dev/null || echo "⚠️ Migration skipped (may already be applied)"

# 启动 Nginx
echo "🌐 Starting Nginx..."
nginx -g 'daemon off;' &

# 启动后端
echo "🔧 Starting backend on port 3699..."
cd /app/backend
node dist/main.js &

echo "✅ All services started!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:3699"
echo "📚 API Docs: http://localhost:3699/api/docs"

# 保持前台运行
wait
