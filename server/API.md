# GradeBook Backend API (v1)

Production-ready backend для мобильного клиента GradeBook.

## Общая информация

- **Base URL:** `http://localhost:3000`
- **API prefix:** `/api/v1`
- **Swagger UI (dev):** `/docs`
- **OpenAPI JSON:** `/docs-json`
- **Content-Type:** `application/json`
- **Timezone бизнес-логики:** `Europe/Moscow`
- **Datetime формат:** ISO 8601 (`2026-02-21T10:00:00.000Z`)
- **Дата для schedule:** `YYYY-MM-DD` (например `2026-02-21`)

## Аутентификация

Используются opaque-токены (stateful sessions в БД):

- `accessToken` — короткоживущий (по умолчанию `15` минут)
- `refreshToken` — долгоживущий (по умолчанию `30` дней)

Для защищенных endpoint:

```http
Authorization: Bearer <accessToken>
```

### Refresh rotation

- Каждый `POST /auth/refresh` выдает новую пару токенов
- Предыдущий refresh-токен инвалидируется
- Access/refresh токены хранятся в БД только как hash

## Роли (RBAC)

- `student`
- `teacher`
- `admin`

Ограничения:

- Изменение оценок: только `teacher/admin`
- Teacher может менять оценки и смотреть расписание только в своем контексте

## Формат ошибок

Единый формат ошибок:

```json
{
  "statusCode": 401,
  "timestamp": "2026-02-21T17:00:00.000Z",
  "path": "/api/v1/users/me",
  "message": "Unauthorized",
  "requestId": "9f3f9c2f-8f5f-4a79-9b4f-39f1e18f6764"
}
```

---

## Auth

### `POST /api/v1/auth/login`

Логин пользователя.

Request:

```json
{
  "login": "student.a",
  "password": "Password123!"
}
```

Response `200`:

```json
{
  "accessToken": "<opaque_access_token>",
  "refreshToken": "<opaque_refresh_token>",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "login": "student.a",
    "role": "student",
    "firstName": "Nikita",
    "lastName": "Ivanov",
    "middleName": null,
    "classRoomId": "uuid",
    "createdAt": "2026-02-21T16:00:00.000Z",
    "updatedAt": "2026-02-21T16:00:00.000Z"
  }
}
```

### `POST /api/v1/auth/refresh`

Обновление токенов (rotation).

Request:

```json
{
  "refreshToken": "<opaque_refresh_token>"
}
```

Response `200`: та же структура, что у `/auth/login`.

### `POST /api/v1/auth/logout`

Ревокация текущей refresh-сессии.

Request:

```json
{
  "refreshToken": "<opaque_refresh_token>"
}
```

Response `200`:

```json
{
  "success": true
}
```

---

## Users / Profile

### `GET /api/v1/users/me`

Профиль текущего пользователя.

### `PATCH /api/v1/users/me`

Частичное обновление профиля.

Request (пример):

```json
{
  "firstName": "Nikita",
  "lastName": "Ivanov",
  "middleName": "Petrovich"
}
```

### `POST /api/v1/users` (`admin`)

Создать пользователя (student/teacher) через админ-панель.

Request:

```json
{
  "role": "student",
  "firstName": "Nikita",
  "lastName": "Ivanov",
  "middleName": "Petrovich",
  "course": 2,
  "group": "A",
  "login": "student.a",
  "password": "Password123!"
}
```

Notes:

- `course` и `group` обязательны для `student`
- для `teacher` поля `course/group` опциональны

---

## Dashboard

### `GET /api/v1/dashboard`

Агрегированные данные для главного экрана:

- `averageGrade`
- `lessonsToday`
- `unreadNotifications`
- `todaySchedule[]`

---

## Subjects & Grades

### `GET /api/v1/subjects`

Список предметов.

Query params (optional):

- `classRoomId` (uuid)
- `teacherId` (uuid, для admin)

### `GET /api/v1/subjects/:id/grades`

Оценки по предмету.

### `GET /api/v1/subjects/:id/stats`

Статистика по предмету:

- `count`
- `average`
- `min`
- `max`

### `POST /api/v1/subjects/:id/grades` (`teacher/admin`)

Создать оценку.

Request:

```json
{
  "studentId": "uuid",
  "value": 5,
  "comment": "Great work",
  "gradedAt": "2026-02-21T09:10:00.000Z"
}
```

### `PATCH /api/v1/grades/:id` (`teacher/admin`)

Обновить оценку.

### `DELETE /api/v1/grades/:id` (`teacher/admin`)

Soft delete оценки.

---

## Schedule

### `GET /api/v1/schedule/week?date=YYYY-MM-DD`

Недельное расписание.

### `GET /api/v1/schedule/day?date=YYYY-MM-DD`

Дневное расписание.

Дополнительные фильтры (teacher/admin):

- `classRoomId`
- `teacherId`

Поведение по ролям:

- `student` — только расписание своего класса
- `teacher` — только собственное расписание
- `admin` — может фильтровать произвольно

### `POST /api/v1/schedule` (`admin`)

Создать урок в расписании.

Request:

```json
{
  "subjectId": "uuid",
  "startsAt": "2026-02-21T08:00:00.000Z",
  "endsAt": "2026-02-21T08:45:00.000Z",
  "room": "101"
}
```

### `PATCH /api/v1/schedule/:id` (`admin`)

Изменить урок (время, аудиторию, предмет).

### `DELETE /api/v1/schedule/:id` (`admin`)

Удалить урок.

---

## Notifications

### `GET /api/v1/notifications`

Список уведомлений с пагинацией и фильтрами.

Query params:

- `status=all|read|unread` (default: `all`)
- `page` (default: `1`)
- `limit` (default: `20`, max: `100`)

Response:

```json
{
  "items": [],
  "page": 1,
  "limit": 20,
  "total": 42,
  "totalPages": 3
}
```

### `PATCH /api/v1/notifications/:id/read`

Отметить одно уведомление как прочитанное.

### `PATCH /api/v1/notifications/read-all`

Отметить все уведомления как прочитанные.

Response:

```json
{
  "updated": 12
}
```

---

## Settings

### `GET /api/v1/settings`

Получить пользовательские настройки.

### `PATCH /api/v1/settings`

Обновить настройки.

Request:

```json
{
  "themeMode": "dark",
  "notifications": {
    "enabled": true,
    "grades": true,
    "homework": false,
    "announcements": true
  }
}
```

`themeMode`:

- `system`
- `light`
- `dark`

---

## Health

### `GET /api/v1/health`

Проверка доступности API и БД.

Response:

```json
{
  "status": "ok",
  "timestamp": "2026-02-21T16:20:00.000Z"
}
```

---

## Полезные команды

```bash
npm run dev
npm run prisma:deploy
npm run prisma:seed
npm run test
npm run test:e2e
```

Экспорт OpenAPI в файл:

```powershell
Invoke-WebRequest http://localhost:3000/docs-json -OutFile openapi.json
```
