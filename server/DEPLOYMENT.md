# Деплой GradeBook Backend на бесплатный хостинг

Ниже два рабочих варианта: **Neon (БД) + Render (API)** и **Railway (всё в одном)**.

---

## Render: пинг каждые 12 минут (чтобы не засыпал)

В репозитории уже есть GitHub Actions: workflow **Render keep-alive** (`.github/workflows/render-keepalive.yml`) раз в 12 минут вызывает `GET /api/v1/health` на вашем Render.

**Что сделать один раз:** в GitHub откройте репозиторий → **Settings** → **Variables and secrets** → **Actions** → **Variables** → **New repository variable**: имя `RENDER_APP_URL`, значение `https://ваш-сервис.onrender.com` (URL из Render Dashboard, без слэша в конце). После пуша в ветку по умолчанию пинг будет выполняться автоматически.

---

## Вариант 1: Neon (PostgreSQL) + Render (Node API)

### Почему так
- **Neon** — бесплатный PostgreSQL без срока действия, с автоотключением при простое (Scale to Zero).
- **Render** — бесплатный Web Service для Node; после 15 минут без запросов засыпает, первый запрос может подниматься до минуты.

### Шаг 1: База данных (Neon)

1. Зарегистрируйтесь на [neon.tech](https://neon.tech) (достаточно GitHub).
2. Создайте проект и базу (имя можно оставить по умолчанию).
3. В разделе **Connection string** скопируйте **connection string** (формат `postgresql://user:password@host/dbname?sslmode=require`). Это ваш `DATABASE_URL`.

### Шаг 2: Бэкенд (Render)

1. Зарегистрируйтесь на [render.com](https://render.com) (через GitHub).
2. **Dashboard** → **New** → **Web Service**.
3. Подключите репозиторий GradeBook-backend (или сделайте форк и подключите его).
4. Настройки:
   - **Root Directory**: `server`
   - **Runtime**: `Docker` (у вас есть `server/Dockerfile`) или **Node** (см. ниже для Node без Docker).
   - **Instance Type**: **Free**.

5. **Environment** (обязательные переменные):

   | Key             | Value |
   |-----------------|--------|
   | `NODE_ENV`      | `production` |
   | `PORT`          | `3000` (Render сам задаёт порт; если используете их переменную, см. ниже) |
   | `DATABASE_URL`  | вставьте строку из Neon (с `?sslmode=require`) |
   | `AUTH_TOKEN_PEPPER` | случайная строка **не короче 16 символов** (сгенерируйте и сохраните) |
   | `CORS_ORIGIN`   | `*` или список доменов/URL вашего приложения через запятую |

   Остальные переменные опциональны (есть значения по умолчанию в коде).

6. **Важно для Render (Node, не Docker):**  
   Если выбрали **Node** вместо Docker:
   - **Build Command**: `npm ci && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma migrate deploy && npm run start:prod`
   - В коде сервер должен слушать `process.env.PORT` (у вас уже так).

   Если Render подставляет свой `PORT`, в `configuration.ts` он уже читается; убедитесь, что приложение запускается так: `app.listen(port)`.

7. Нажмите **Create Web Service**. После деплоя Render покажет URL вида `https://your-service.onrender.com`.

8. Проверка: откройте в браузере `https://your-service.onrender.com/api/v1/health` — должен вернуться ответ `{"status":"ok",...}`.

### Шаг 3: Сид (начальные данные, по желанию)

Локально один раз выполните сид в прод-базу (подставьте ваш `DATABASE_URL` из Neon):

```bash
cd server
DATABASE_URL="postgresql://..." npx prisma db seed
```

Либо добавьте на Render одноразовую задачу/скрипт, который выполнит `npx prisma db seed` с тем же `DATABASE_URL`.

---

## Вариант 2: Всё на Railway

- **Плюсы**: один сервис, БД и бэкенд в одном проекте, удобно.
- **Минусы**: бесплатно только trial $5 (до ~30 дней) и затем около $1/мес; дальше нужна карта.

1. Зарегистрируйтесь на [railway.app](https://railway.app), подключите GitHub.
2. **New Project** → **Deploy from GitHub repo** (или **Add PostgreSQL** + **Empty Service**).
3. Добавьте сервис **PostgreSQL** (из шаблона или через **New** → **Database** → **PostgreSQL**). Railway выдаст переменную `DATABASE_URL` — она подставится в проект.
4. Добавьте сервис из репозитория:
   - Укажите **Root Directory**: `server`.
   - **Build**: Railway может использовать ваш `Dockerfile` в `server/` или собрать через Node (см. документацию Railway).
   - В переменных окружения задайте `AUTH_TOKEN_PEPPER` (строка ≥ 16 символов), при необходимости `CORS_ORIGIN`. `DATABASE_URL` можно связать с сервисом PostgreSQL в настройках проекта.
5. Деплой: после пуша в репозиторий Railway пересоберёт и перезапустит сервис.
6. В настройках сервиса откройте **Settings** → **Networking** → **Generate domain** — получите URL вида `https://xxx.up.railway.app`. Проверка: `https://xxx.up.railway.app/api/v1/health`.

---

## Вариант 3: Neon (БД) + Fly.io (API) — быстро, без засыпания

Подходит, если готовы платить от ~$5/мес: инстанс не засыпает, API отвечает быстро.

1. БД — как в варианте 1, создаёте проект в [Neon](https://neon.tech) и копируете `DATABASE_URL`.
2. Установите [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/) и выполните `fly auth login`.
3. В корне репозитория (или в `server/`): `fly launch` — выберите организацию, имя приложения (например `gradebook-api`), регион, **не** создавайте Postgres (БД уже в Neon).
4. В `server/` создайте `fly.toml` (или отредактируйте сгенерированный), чтобы корень образа был `server/`:
   - Укажите `app` с нужным именем.
   - В секции `[build]`: `dockerfile = "Dockerfile"` (путь относительно `server/`).
   - Секция `[env]`: не задавайте секреты здесь.
5. Секреты задайте в Dashboard Fly.io или через CLI:
   ```bash
   fly secrets set DATABASE_URL="postgresql://..." AUTH_TOKEN_PEPPER="ваша_строка_16_символов"
   ```
6. Деплой: `fly deploy` (из папки, где `Dockerfile` и `fly.toml`; обычно `server/`). После деплоя URL будет вида `https://gradebook-api.fly.dev`. Проверка: `https://gradebook-api.fly.dev/api/v1/health`.

В репозитории уже есть `server/fly.toml`. Деплой из папки `server`: `fly deploy`. Чтобы инстанс не останавливался при простое (всегда быстрый ответ), в `fly.toml` задано `min_machines_running = 1`. Для экономии можно поставить `0` — тогда будет scale-to-zero и холодный старт при первом запросе.

---

## Переменные окружения (production)

Обязательные:

| Переменная | Описание |
|------------|----------|
| `DATABASE_URL` | Строка подключения PostgreSQL (из Neon, Render или Railway). |
| `AUTH_TOKEN_PEPPER` | Секрет для подписи токенов, **не менее 16 символов**, случайная строка. |

Рекомендуемые:

| Переменная | Пример | Описание |
|------------|--------|----------|
| `NODE_ENV` | `production` | Режим приложения. |
| `PORT` | `3000` | Порт (на Render/Railway часто подставляется автоматически). |
| `CORS_ORIGIN` | `https://yourapp.com` или `*` | Разрешённые источники для CORS. |
| `HOST` | `0.0.0.0` | Уже по умолчанию в коде; нужен для приёма запросов с любого интерфейса. |

Остальные (TTL токенов, rate limit, Swagger) имеют значения по умолчанию в `configuration.ts`.

---

## Фронт (Expo / мобильное приложение)

После деплоя замените базовый URL API на ваш хост:

- **Render**: `https://your-service.onrender.com`
- **Railway**: `https://xxx.up.railway.app`

В проекте приложения (GradeBook) в `.env`:

```env
EXPO_PUBLIC_API_URL=https://your-service.onrender.com
```

Префикс `/api/v1` уже есть в путях запросов на клиенте (например, `/api/v1/auth/login`), отдельно в URL добавлять не нужно — только домен выше.

---

## Кратко

1. **БД**: Neon (бесплатно, без срока) или Render/Railway Postgres (у Render free DB живёт 30 дней).
2. **API**: Render (Free Web Service) или Railway (trial / недорого).
3. В production задать `DATABASE_URL`, `AUTH_TOKEN_PEPPER`, при необходимости `CORS_ORIGIN`.
4. На фронте в `EXPO_PUBLIC_API_URL` указать итоговый URL бэкенда (без `/api/v1`).

После первого деплоя проверьте `/api/v1/health` и логин через приложение.
