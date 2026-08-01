# thai-pila-api

Backend API สำหรับโปรเจค THAI PILA (Express + TypeScript + PostgreSQL)

## ความต้องการของระบบ

- [Node.js](https://nodejs.org/) 18 ขึ้นไป
- npm
- PostgreSQL 14 ขึ้นไป

## ติดตั้งและรันบน Local

### 1. ติดตั้ง dependencies

```bash
npm install
```

### 2. ตั้งค่า environment

คัดลอกไฟล์ตัวอย่างแล้วแก้ค่าให้ตรงกับฐานข้อมูลของคุณ:

```bash
cp .env.example .env
```

ตัวแปรสำคัญใน `.env`:

| ตัวแปร | คำอธิบาย | ตัวอย่าง |
|--------|----------|---------|
| `PORT` | พอร์ต API | `3001` |
| `DB_HOST` | host ของ PostgreSQL | `localhost` |
| `DB_PORT` | พอร์ต PostgreSQL | `5432` |
| `DB_USER` | username | `postgres` |
| `DB_PASS` | password | *(รหัสของคุณ)* |
| `DB_NAME` | ชื่อ database | `thai_pila` |
| `JWT_SECRET` | secret สำหรับออก JWT ของ admin | สตริงยาวแบบสุ่ม |

หรือใช้ `DATABASE_URL` แทนกลุ่ม `DB_*` ก็ได้:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/thai_pila
```

> **อย่า commit ไฟล์ `.env`** — มีอยู่ใน `.gitignore` แล้ว

### 3. รันเซิร์ฟเวอร์

โหมดพัฒนา (hot reload ด้วย nodemon):

```bash
npm run dev
```

หรือ:

```bash
npm run watch
```

รันปกติ:

```bash
npm start
```

API จะเปิดที่ [http://localhost:3001](http://localhost:3001)

### 4. Build TypeScript

```bash
npm run build
```

## สคริปต์

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `npm run dev` | รันด้วย nodemon |
| `npm run watch` | watch ไฟล์แล้วรีรันด้วย ts-node |
| `npm start` | รันด้วย ts-node |
| `npm run build` | compile TypeScript |

## หมายเหตุความปลอดภัย

- เก็บ `DB_PASS` และ `JWT_SECRET` ไว้ใน `.env` เท่านั้น ห้าม hardcode ในโค้ด
- ก่อนเปิด repo เป็นสาธารณะ ตรวจว่าไม่มี credential จริงในโค้ดหรือประวัติ commit
