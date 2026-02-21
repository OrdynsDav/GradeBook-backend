# GradeBook Backend

Backend для мобильного приложения GradeBook на `NestJS + PostgreSQL + Prisma`.

## Документация

- Полная API-документация в Markdown: `API.md`
- Swagger UI (dev): `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs-json`
- Экспортированный OpenAPI файл: `openapi.json`

## Быстрый старт

```bash
npm install
npm run prisma:deploy
npm run prisma:seed
npm run dev
```

## Основные скрипты

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run test:e2e
npm run prisma:migrate
npm run prisma:seed
```

## Переменные окружения

Скопируй шаблон:

```bash
cp .env.example .env
```

Для Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

## Docker

Из корня репозитория:

```bash
docker compose up --build -d
docker compose exec api npm run prisma:seed
```
