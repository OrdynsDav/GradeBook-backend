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
    "groupId": "uuid",
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

### `GET /api/v1/users/:id` (admin)

Получить пользователя по ID. Ответ в том же формате, что и `GET /users/me` (с полем `group` при наличии).

### `PATCH /api/v1/users/:id` (admin)

Обновить пользователя. Все поля опциональны.

Request:

```json
{
  "firstName": "Nikita",
  "lastName": "Ivanov",
  "middleName": "Petrovich",
  "groupId": "uuid",
  "login": "student.a",
  "password": "NewPassword123!"
}
```

- `groupId` — ID группы (для студента); группа должна существовать.
- `login` — должен быть уникальным (проверка кроме текущего пользователя).
- `password` — новый пароль (если нужно сменить).

### `DELETE /api/v1/users/:id` (admin)

Удалить пользователя.

- Нельзя удалить себя (текущего пользователя).
- Нельзя удалить пользователя, у которого есть привязанные предметы (учитель), уроки или созданные оценки. Сначала нужно удалить или переназначить их.

Response `200`: `{ "id": "uuid" }`

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

- `groupId` (uuid)
- `teacherId` (uuid, для admin)

### `POST /api/v1/subjects` (admin)

Создать предмет. К предмету (по его id) привязываются оценки и уроки.

Request:

```json
{
  "name": "Математика",
  "groupId": "uuid",
  "teacherId": "uuid"
}
```

- `groupId` — существующая группа (создайте через `POST /groups`, если нет).
- `teacherId` — существующий пользователь с ролью `teacher`.
- В одной группе не может быть двух предметов с одинаковым именем (уникальность `name` + `groupId`).

### `PATCH /api/v1/subjects/:id` (admin)

Обновить предмет (название, группа, учитель). Все поля опциональны.

Request:

```json
{
  "name": "Математика",
  "groupId": "uuid",
  "teacherId": "uuid"
}
```

### `DELETE /api/v1/subjects/:id` (admin)

Удалить предмет. Оценки и уроки по этому предмету удаляются каскадно.

Response `200`: `{ "id": "uuid" }`

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

- `groupId`
- `teacherId`

Поведение по ролям:

- `student` — только расписание своей группы
- `teacher` — только собственное расписание
- `admin` — может фильтровать произвольно

### `POST /api/v1/schedule/import` (`admin`)

Импорт расписания из Excel (.xlsx).

**Способ 1:** `multipart/form-data`, поле **`file`** (макс. 10 МБ).

**Способ 2 (если multipart не доходит до сервера):** `application/json`, тело `{ "fileBase64": "<содержимое файла в base64>" }`.

Ожидаемая структура первого листа:

- Первая строка (или строка с «Предмет» в колонке C): колонки A–C — «День недели/дата», «№ занятия/ время», «Столбец1»; начиная с колонки D — названия групп (БЭ13, И14-1 и т.д.).
- Далее блоки по **3 строки** на каждый слот:
  - Строка 1: в A — дата (например «Вторник 24.02.2026г.» или «24.02.2026»), в B — время (например «8:15 - 9:45»), в C — «Предмет», в D, E, … — названия предметов по группам.
  - Строка 2: в C — «Преподаватель», в D, E, … — ФИО преподавателей (например «Филиппова О.С.»).
  - Строка 3: в C — «Кабинет», в D, E, … — аудитории.

Группы сопоставляются с БД по полям `name` / `groupName` (без учёта регистра). Учителя — по фамилии и инициалам. Если предмета с такой связкой (название + группа + учитель) нет, он создаётся. Уже существующие уроки на ту же группу и время не дублируются.

Response `200`:

```json
{
  "created": 42,
  "skipped": 3,
  "errors": ["Group not found: \"Х14\" (2026-02-24 Математика)", "Teacher not found: \"Иванов И.И.\" (2026-02-24 Физика)"]
}
```

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
