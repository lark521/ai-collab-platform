# =====================
# Stage 1: Backend Build
# =====================
FROM node:20-alpine AS backend-build

WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend/prisma ./prisma
RUN npx prisma generate
COPY backend .
RUN npm run build

# =====================
# Stage 2: Frontend Build
# =====================
FROM node:20-alpine AS frontend-build

WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend .
RUN npm run build

# =====================
# Stage 3: Production
# =====================
FROM node:20-alpine AS production

# 安装 PostgreSQL 客户端工具（用于迁移）
RUN apk add --no-cache postgresql-client dumb-init

WORKDIR /app

# 后端
COPY --from=backend-build /app/node_modules ./backend/node_modules
COPY --from=backend-build /app/dist ./backend/dist
COPY --from=backend-build /app/prisma ./backend/prisma
COPY --from=backend-build /app/package.json ./backend/

# 前端（Nginx 静态文件）
COPY --from=frontend-build /app/dist ./frontend-dist

# Nginx 配置
RUN apk add --no-cache nginx
COPY nginx.conf /etc/nginx/http.d/default.conf

# 环境变量
ENV NODE_ENV=production
ENV PORT=3699
ENV DATABASE_URL=postgresql://postgres:postgres@db:5432/aicollab
ENV REDIS_HOST=redis
ENV FRONTEND_URL=http://localhost:3000

EXPOSE 3000 3001

# 启动脚本
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

CMD ["docker-entrypoint.sh"]
