# 使用Node.js官方镜像作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建TypeScript代码
RUN npm run build

# 设置环境变量
ENV NODE_ENV=production

# 暴露端口
EXPOSE 3000

# 创建日志目录
RUN mkdir -p /app/logs

# 设置启动命令
CMD ["node", "dist/app.js"]