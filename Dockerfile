# Smart CRM – Bảo hành (Node.js 22 + Express). Chạy: docker compose up --build
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Cài thư viện trước để Docker tận dụng cache khi chỉ sửa mã nguồn.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY scripts ./scripts
COPY db ./db

# Chạy bằng user thường (không dùng root).
USER node
EXPOSE 3000

# Migration và seed đều chạy lại được nhiều lần không tạo bản ghi trùng (tiêu chí C5).
CMD ["sh", "-c", "npm run migrate && npm run seed && npm start"]
