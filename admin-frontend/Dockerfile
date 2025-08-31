# ===== 构建阶段 =====
FROM node:18-alpine AS build
WORKDIR /app

# ⚠️ 注意：context 是 admin-frontend，所以这里不用再写 admin-frontend/ 前缀
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ===== 运行阶段 =====
FROM nginx:1.25-alpine
# 自定义站点配置（如果有）
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 拷贝打包产物
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]