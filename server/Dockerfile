# 使用 Node.js 官方镜像
# FROM node:20.18.0

FROM swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/node:20.18.0


# 设置工作目录
WORKDIR /app

# 拷贝依赖文件
COPY package*.json ./

# 安装依赖
RUN npm install --omit=dev

# 拷贝所有后端项目代码（在 server/ 目录下）
COPY . .

# 设置生产环境变量
ENV NODE_ENV=production

# 启用端口
EXPOSE 80

# 启动服务
CMD ["node", "index.js"]
