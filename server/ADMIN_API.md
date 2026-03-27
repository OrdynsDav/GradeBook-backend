# GradeBook Admin Panel API

Практическая документация для админ-панели (только то, что нужно администратору).

## Base

- Base URL (dev): `http://localhost:3000`
- Prefix: `/api/v1`
- Все защищенные запросы требуют:

```http
Authorization: Bearer <accessToken>
```

---

## 1. Auth (вход в админку)

## `POST /api/v1/auth/login`

Вход пользователя (в том числе администратора).

Request:

```json
{
  "login": "admin",
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
    "login": "admin",
    "role": "admin",
    "firstName": "System",
    "lastName": "Admin",
    "middleName": null,
    "groupId": null,
    "createdAt": "2026-03-27T10:00:00.000Z",
    "updatedAt": "2026-03-27T10:00:00.000Z"
  }
}
```

## `POST /api/v1/auth/refresh`

Обновление пары токенов (rotation).

```json
{ "refreshToken": "<opaque_refresh_token>" }
```

## `POST /api/v1/auth/logout`

Выход:

```json
{ "refreshToken": "<opaque_refresh_token>" }
```

Response:

```json
{ "success": true }
```

---

## 2. Users (admin)

## `GET /api/v1/users`

Список пользователей для админки.

- Access: `admin`
- Сортировка: роль -> фамилия -> имя.

Response: массив пользователей с `group` (если есть).

## `GET /api/v1/users/:id`

Получить пользователя по ID.

- Access: `admin`

## `POST /api/v1/users`

Создать пользователя (`student` или `teacher`).

- Access: `admin`

### Вариант 1: создание студента

```json
{
  "role": "student",
  "firstName": "Давит",
  "lastName": "Акобян",
  "middleName": "Варданович",
  "course": 2,
  "group": "И14-1",
  "login": "student",
  "password": "Password123!"
}
```

Правила:
- `course` и `group` обязательны для `student`.
- Если группы нет, создается/находится по `course + group`.

### Вариант 2: создание преподавателя с предметами

```json
{
  "role": "teacher",
  "firstName": "Иван",
  "lastName": "Иванов",
  "middleName": "Иванович",
  "subjects": [
    {
      "name": "Математика",
      "groups": ["И14-1", "И14-2"]
    }
  ],
  "login": "teacher.math",
  "password": "Password123!"
}
```

## `PATCH /api/v1/users/:id`

Обновить пользователя.

- Access: `admin`
- Все поля опциональны.

Request:

```json
{
  "firstName": "Давид",
  "groupId": "9b39dc84-e393-442f-8191-f8c65f2f1c14",
  "login": "student.new",
  "password": "NewPassword123!"
}
```

## `DELETE /api/v1/users/:id`

Удалить пользователя.

- Access: `admin`
- Нельзя удалить самого себя.
- Нельзя удалить пользователя с привязанными сущностями (предметы, уроки, созданные оценки).

Response:

```json
{ "id": "uuid" }
```

---

## 3. Groups (admin)

## `GET /api/v1/groups`

Список групп (доступен и другим ролям, но важен для админки).

## `GET /api/v1/groups/:id`

- Access: `admin`

## `POST /api/v1/groups`

Создать группу.

- Access: `admin`

```json
{
  "course": 2,
  "groupName": "И14-1"
}
```

## `PATCH /api/v1/groups/:id`

Изменить группу.

- Access: `admin`

```json
{
  "course": 2,
  "groupName": "И14-2"
}
```

## `DELETE /api/v1/groups/:id`

Удалить группу.

- Access: `admin`

---

## 4. Subjects (admin)

## `GET /api/v1/subjects?groupId=<uuid>&teacherId=<uuid>`

Список предметов.

- Для `admin` можно фильтровать по `groupId` и `teacherId`.

## `POST /api/v1/subjects`

Создать предмет.

- Access: `admin`

```json
{
  "name": "Математика",
  "groupId": "uuid",
  "teacherId": "uuid"
}
```

## `GET /api/v1/subjects/:id`

Получить предмет.

- Access: `admin`

## `PATCH /api/v1/subjects/:id`

Обновить предмет.

- Access: `admin`

```json
{
  "name": "Алгебра",
  "groupId": "uuid",
  "teacherId": "uuid"
}
```

## `DELETE /api/v1/subjects/:id`

Удалить предмет.

- Access: `admin`
- Оценки и уроки по предмету удаляются каскадно.

---

## 5. Grades (admin)

## `GET /api/v1/subjects/:id/grades`

Список оценок по предмету.

- Access: `admin`, `teacher`, `student` (с ограничениями по роли)
- Для `admin`: полный список по предмету.
- Порядок: сначала новые (`gradedAt desc`, `createdAt desc`).

## `GET /api/v1/subjects/:id/stats`

Статистика оценок по предмету:

```json
{
  "subjectId": "uuid",
  "count": 32,
  "average": 4.1,
  "min": 2,
  "max": 5
}
```

## `POST /api/v1/subjects/:id/grades`

Добавить оценку.

- Access: `teacher`, `admin`

```json
{
  "studentId": "uuid",
  "value": 5,
  "comment": "Отлично",
  "gradedAt": "2026-03-27T11:30:00.000Z"
}
```

Правила:
- `studentId` должен быть студентом той же группы, что и предмет.
- При создании оценки генерируется уведомление студенту.

## `PATCH /api/v1/grades/:id`

Изменить оценку.

- Access: `teacher`, `admin`

```json
{
  "value": 4,
  "comment": "Исправлено",
  "gradedAt": "2026-03-27T11:40:00.000Z"
}
```

## `DELETE /api/v1/grades/:id`

Удалить оценку (soft delete).

- Access: `teacher`, `admin`

---

## 6. Schedule (admin)

## `GET /api/v1/schedule/week?date=YYYY-MM-DD&groupId=<uuid>&teacherId=<uuid>`

Недельное расписание.

- Для `admin` доступны все фильтры.

## `GET /api/v1/schedule/day?date=YYYY-MM-DD&groupId=<uuid>&teacherId=<uuid>`

Дневное расписание.

## `GET /api/v1/schedule/:id`

Получить урок по ID.

- Access: `admin`

## `POST /api/v1/schedule`

Создать урок.

- Access: `admin`

```json
{
  "subjectId": "uuid",
  "startsAt": "2026-03-30T08:00:00.000Z",
  "endsAt": "2026-03-30T09:30:00.000Z",
  "room": "101"
}
```

## `PATCH /api/v1/schedule/:id`

Обновить урок.

- Access: `admin`

```json
{
  "room": "305"
}
```

## `DELETE /api/v1/schedule/:id`

Удалить урок.

- Access: `admin`

## `POST /api/v1/schedule/import`

Импорт расписания из `.xlsx`.

- Access: `admin`
- Варианты:
  - `multipart/form-data` с полем `file`
  - `application/json` с `{ "fileBase64": "..." }`

Пример ответа:

```json
{
  "created": 42,
  "skipped": 3,
  "errors": []
}
```

---

## 7. Dashboard (admin)

## `GET /api/v1/dashboard`

Сводка для главной админки:

```json
{
  "averageGrade": 4.23,
  "lessonsToday": 57,
  "unreadNotifications": 0,
  "todaySchedule": []
}
```

---

## 8. Error format

Единый формат ошибок:

```json
{
  "statusCode": 400,
  "timestamp": "2026-03-27T12:00:00.000Z",
  "path": "/api/v1/users",
  "message": "Validation failed",
  "requestId": "uuid"
}
```

Где смотреть детали:
- `message`: строка или массив строк
- `statusCode`: HTTP-код ошибки
- `requestId`: полезен для трассировки в логах

---

## 9. Quick checklist for admin frontend

- Хранить `accessToken` и `refreshToken`.
- На `401` делать `POST /auth/refresh`, затем повтор запроса.
- Перед созданием предмета подгружать списки `groups` и `teachers`.
- Для списка оценок использовать `GET /subjects/:id/grades` (уже отсортирован по последним).
- Для CRUD-форм учитывать строгую валидацию: лишние поля дадут `400`.

---

## 10. Types reference

Для TypeScript-клиента используйте:
- `frontend-types.ts`
- `API_TYPES.md` (расширенное описание интерфейсов)

