# ---- ระบบยื่นใบลา (production image) ----
FROM node:24-slim

WORKDIR /app

# ติดตั้ง dependencies (ใช้ lockfile, ข้าม devDependencies)
COPY package*.json ./
RUN npm ci --omit=dev

# คัดลอกซอร์สที่เหลือ
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
# ค่าเริ่มต้น: เก็บ DB/ไฟล์แนบไว้บน volume /data (mount persistent disk มาที่นี่)
ENV DB_PATH=/data/absence.db
ENV UPLOAD_DIR=/data/uploads

EXPOSE 3000
CMD ["node", "src/server.js"]
