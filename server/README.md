# GradeBook Backend

Backend для мобильного приложения GradeBook на `NestJS + PostgreSQL + Prisma`.

## Документация

- Полная API-документация в Markdown: `API.md`
- Большая документация по интерфейсам и типам: `API_TYPES.md`
- Документация для админ-панели: `ADMIN_API.md`
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

## Обзор структуры и API (для фронтенда)

### Общая структура проекта

- **Корень репозитория**: `GradeBook-backend`
  - **Backend (NestJS)**: `server`
    - Важно:
      - `src/main.ts` – точка входа, глобальные пайпы/guards, CORS, Swagger.
      - `src/app.module.ts` – подключение всех модулей.
      - `API.md` – подробное текстовое описание API.
      - `frontend-types.ts` – единый файл типов для фронтенда.
      - `openapi.json` – экспортированная OpenAPI‑схема (аналог `/docs-json`).

- **Основные модули в `server/src`**:
  - `auth` – логин/refresh/logout.
  - `users` – текущий пользователь и админ‑управление пользователями.
  - `groups` – учебные группы.
  - `subjects` – предметы.
  - `grades` – создание/редактирование/удаление оценок.
  - `schedule` – расписание, в том числе импорт из Excel.
  - `notifications` – уведомления пользователю.
  - `settings` – пользовательские настройки (тема, уведомления).
  - `dashboard` – агрегированный дашборд.
  - `health` – health‑чек.
  - `common` – Prisma, guards, пайпы, фильтры, утилиты.
  - `config` – конфигурация и валидация окружения.

### Конфигурация и окружение

- **ENV‑файлы**: `server/.env` (рабочий), `server/.env.example` (пример).
  - Важные переменные:
    - `PORT`, `HOST` – базовый URL (по умолчанию `http://localhost:3000`).
    - `CORS_ORIGIN` – разрешённые источники для API.
    - `DATABASE_URL` – строка подключения к Postgres.
    - `AUTH_*` – время жизни и настройки токенов.

- **Глобальный префикс API**: все маршруты начинаются с `http://<host>:<port>/api/v1`.

- **Swagger/OpenAPI**:
  - UI: `GET /docs` (если `SWAGGER_ENABLED=true`).
  - JSON‑схема: `GET /docs-json` (дубликат файла `openapi.json`).

### Авторизация, валидация и формат ошибок

- **Авторизация**:
  - Все защищённые эндпоинты требуют заголовок:
    - `Authorization: Bearer <accessToken>`.
  - Access/refresh‑токены – opaque‑строки, срок жизни задаётся в ENV.

- **Основные эндпоинты авторизации** (см. ниже модуль `Auth`):
  - `POST /api/v1/auth/login` – вход, возвращает `AuthResponse`.
  - `POST /api/v1/auth/refresh` – обновление пары токенов.
  - `POST /api/v1/auth/logout` – разлогинивание по refresh‑токену.

- **Роли**:
  - `Role`: `"student" | "teacher" | "admin"`.
  - Guards проверяют доступ на уровне контроллеров/методов (например, почти весь `users` кроме `/me` – только для `admin`).

- **Валидация запросов**:
  - Глобальный `ValidationPipe`:
    - `whitelist: true` и `forbidNonWhitelisted: true` – лишние поля в теле запроса приводят к `400 Bad Request`.
    - `transform: true` и `enableImplicitConversion: true` – автоматическое приведение типов.
  - Все входящие строки дополнительно проходят через `SanitizeInputPipe`.

- **Формат ошибок** (для фронтенда):
  - Тип `ApiErrorResponse` (в `frontend-types.ts`):
    - `statusCode: number`
    - `message: string | string[]`
    - `error?: string`
    - `path?: string`
    - `timestamp?: string`
    - `requestId?: string`

### Модули и эндпоинты (что дергать фронту)

Во всех путях ниже предполагается префикс `/api/v1`.

#### Auth (`/auth`)

- **POST `/auth/login`**
  - Тело (`LoginRequest`):
    - `login: string`
    - `password: string`
  - Ответ (`AuthResponse`):
    - `accessToken: string`
    - `refreshToken: string`
    - `expiresIn: number`
    - `user: User`

- **POST `/auth/refresh`**
  - Тело (`RefreshRequest`):
    - `refreshToken: string`
  - Ответ: `AuthResponse`.

- **POST `/auth/logout`**
  - Тело (`LogoutRequest`):
    - `refreshToken: string`
  - Ответ (`LogoutResponse`):
    - `{ success: boolean }`.

#### Users (`/users`)

- **GET `/users/me`** – возвращает `User`.
- **PATCH `/users/me`**
  - Тело (`UpdateMeRequest`):
    - `firstName?: string`
    - `lastName?: string`
    - `middleName?: string | null`
  - Ответ: обновлённый `User`.
- **GET `/users`**, **POST `/users`**, **GET/PATCH/DELETE `/users/:id`** – админ‑управление пользователями (`CreateUserByAdminRequest`, `UpdateUserByAdminRequest` и т.д.).

#### Groups (`/groups`)

- **GET `/groups`**
  - Ответ: `GroupListItem[]`.
- **GET `/groups/:id`**, **POST `/groups`**, **PATCH `/groups/:id`**, **DELETE `/groups/:id`** – CRUD групп (только для администратора).

#### Subjects и Grades (`/subjects`, `/grades`)

- **GET `/subjects`**
  - Query (`SubjectsQueryParams`):
    - `groupId?: string`
    - `teacherId?: string`
  - Ответ: `SubjectListItem[]`.
- **POST `/subjects`**, **GET `/subjects/:id`**, **PATCH `/subjects/:id`**, **DELETE `/subjects/:id`** – работа с предметами.
- **GET `/subjects/:id/grades`** – список `GradeItem[]` по предмету.
- **GET `/subjects/:id/stats`** – агрегированная статистика по оценкам предмета.
- **POST `/subjects/:id/grades`**, **PATCH `/grades/:id`**, **DELETE `/grades/:id`** – создание и изменение оценок (`CreateGradeRequest`, `UpdateGradeRequest`).

#### Schedule (`/schedule`)

- **GET `/schedule/week`**
  - Query (`ScheduleQueryParams`):
    - `date: string` (`YYYY-MM-DD`)
    - `groupId?: string`
    - `teacherId?: string`
  - Ответ: `LessonItem[]` за неделю.
- **GET `/schedule/day`** – то же, но за день.
- **POST `/schedule`**, **PATCH `/schedule/:id`**, **DELETE `/schedule/:id`** – управление уроками.
- **POST `/schedule/import`** – импорт расписания из Excel (multipart‑файл или base64 JSON).

#### Notifications (`/notifications`)

- **GET `/notifications`**
  - Query (`NotificationsQueryParams`):
    - `status?: "all" | "read" | "unread"`
    - `page?: number`
    - `limit?: number`
  - Ответ: `NotificationsListResponse`.
- **PATCH `/notifications/read-all`** – пометить все уведомления как прочитанные.
- **PATCH `/notifications/:id/read`** – пометить конкретное уведомление как прочитанное.

#### Settings (`/settings`)

- **GET `/settings`** – получить `SettingsResponse`.
- **PATCH `/settings`**
  - Тело (`UpdateSettingsRequest`): частичное обновление `themeMode` и `notifications`.

#### Dashboard (`/dashboard`)

- **GET `/dashboard`**
  - Ответ (`DashboardResponse`):
    - `averageGrade: number | null`
    - `lessonsToday: number`
    - `unreadNotifications: number`
    - `todaySchedule: LessonItem[]`.

#### Health (`/health`)

- **GET `/health`** *(публичный)* – проверка состояния сервиса.

### Типы для фронтенда

- Все основные типы для клиента собраны в `server/frontend-types.ts`. Рекомендуется импортировать их напрямую в фронтенд‑код вместо дублирования:
  - сущности: `User`, `Group`, `GroupListItem`, `SubjectListItem`, `GradeItem`, `LessonItem`, `NotificationItem`, `SettingsResponse`, `DashboardResponse` и др.;
  - запросы: `LoginRequest`, `RefreshRequest`, `CreateUserByAdminRequest`, `CreateSubjectRequest`, `CreateGradeRequest`, `ScheduleQueryParams`, `NotificationsQueryParams`, `UpdateSettingsRequest` и др.;
  - вспомогательные: `Role`, `ThemeMode`, `NotificationType`, `NotificationStatus`, `ApiErrorResponse`.

### Что можно безопасно менять

- **На фронтенде**:
  - Можно использовать типы из `frontend-types.ts` как источник правды и расширять их своими UI‑полями.
  - Можно свободно реализовывать логику хранения токенов и авто‑refresh.
- **Нужно быть аккуратным**:
  - Не менять строки путей (`/auth/login`, `/users/me`, `/schedule/week` и т.д.) и значения enum‑ов.
  - Не отправлять в запросах лишние поля: `ValidationPipe` с `forbidNonWhitelisted` вернёт `400`.
  - Все даты приходят как ISO‑строки; конвертацию в локальное время нужно делать на фронте.
