# GradeBook API: Interfaces and Types Guide

Подробная документация по интерфейсам и типам API для фронтенда.

Этот документ дополняет:
- `API.md` (описание endpoint-ов и бизнес-правил)
- `frontend-types.ts` (источник TypeScript-типов для клиента)

## 1) Conventions and Contracts

- **Base URL (dev):** `http://localhost:3000`
- **API prefix:** `/api/v1`
- **Content-Type:** `application/json`
- **Date format:** ISO 8601 UTC (например `2026-02-21T10:00:00.000Z`)
- **Schedule date query:** `YYYY-MM-DD` (например `2026-02-21`)

### Null vs Undefined

- `null` означает "значение явно отсутствует" (например `middleName: null`, `group: null`).
- `undefined` в ответах API обычно не сериализуется JSON-ом и чаще относится к TS-типизации на стороне клиента.
- Для надежной работы UI проверяйте nullable-поля явно.

### Role-based behavior

- `Role = 'student' | 'teacher' | 'admin'`
- Доступ и форма данных в некоторых endpoint-ах зависят от роли.

---

## 2) Core Enums and Value Types

## `Role`

```ts
export type Role = 'student' | 'teacher' | 'admin';
```

Используется в:
- `User.role`
- проверках доступа на клиенте и роутинге интерфейса

## `ThemeMode`

```ts
export type ThemeMode = 'system' | 'light' | 'dark';
```

Используется в:
- `SettingsResponse.themeMode`
- `UpdateSettingsRequest.themeMode`

## Notification enums

```ts
export type NotificationType = 'grade' | 'homework' | 'announcement' | 'system';
export type NotificationStatus = 'unread' | 'read';
export type NotificationFilterStatus = 'all' | 'read' | 'unread';
```

Используются в:
- `NotificationItem.type`, `NotificationItem.status`
- фильтрах списка уведомлений

## `CreatableRole`

```ts
export type CreatableRole = 'student' | 'teacher';
```

Используется в:
- `CreateUserByAdminRequest.role`
- ограничение: админ через API не создает `admin` этим контрактом

---

## 3) Auth Types

## Requests

```ts
export interface LoginRequest {
  login: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}
```

## Responses

```ts
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface LogoutResponse {
  success: boolean;
}
```

### Example: login response

```json
{
  "accessToken": "<opaque_access_token>",
  "refreshToken": "<opaque_refresh_token>",
  "expiresIn": 900,
  "user": {
    "id": "9b1e5a02-aed8-408b-9a54-039af2133612",
    "login": "student",
    "role": "student",
    "firstName": "Давит",
    "lastName": "Акобян",
    "middleName": "Варданович",
    "groupId": "9b39dc84-e393-442f-8191-f8c65f2f1c14",
    "createdAt": "2026-03-02T16:24:40.681Z",
    "updatedAt": "2026-03-02T16:24:40.681Z"
  }
}
```

### Important compatibility note

- В auth-ответах используется `groupId`.
- Полей `classId` / `className` в текущем контракте **нет**.
- Для экрана профиля и расширенных представлений используйте `GET /users/me`, где доступно `group`.

---

## 4) User and Group Domain Types

## `Group`

```ts
export interface Group {
  id: string;
  name: string;
  course: number;
  groupName: string;
}
```

## `User`

```ts
export interface User {
  id: string;
  login: string;
  role: Role;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  groupId?: string | null;
  group?: Group | null;
  createdAt: string;
  updatedAt: string;
}
```

### Поле `groupId` vs поле `group`

- `groupId`:
  - чаще приходит в auth (`/auth/login`, `/auth/refresh`)
  - минимальная связь пользователя с группой
- `group`:
  - объект с деталями группы
  - обычно в `GET/PATCH /users/me` и ряде admin-ответов

### Normalized UI strategy (recommended)

1. После логина сохранить `auth.user.groupId`.
2. Для экрана профиля загрузить `GET /users/me`.
3. В единой модели UI хранить:
   - `groupId` как идентификатор
   - `groupName` derived из `user.group?.name`

## User edit/create payloads

```ts
export interface UpdateMeRequest {
  firstName?: string;
  lastName?: string;
  middleName?: string;
}
```

```ts
export interface CreateTeacherSubjectItem {
  name: string;
  groupId?: string;
  groupIds?: string[];
  groups?: string[];
}
```

```ts
export interface CreateUserByAdminRequest {
  role: CreatableRole;
  firstName: string;
  lastName: string;
  middleName?: string;
  course?: number;
  group?: string;
  subjects?: CreateTeacherSubjectItem[];
  login: string;
  password: string;
}
```

```ts
export interface UpdateUserByAdminRequest {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  groupId?: string;
  login?: string;
  password?: string;
}
```

### Admin create constraints

- Для `student` обязательны `course` и `group`.
- Для `teacher` можно передать `subjects`.
- `login` должен быть уникален.

## Group list/create

```ts
export interface GroupListItem {
  id: string;
  name: string;
  course: number;
  groupName: string;
  curatorId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGroupRequest {
  course: number;
  groupName: string;
}
```

---

## 5) Schedule, Dashboard, Subjects, Grades

## Shared refs

```ts
export interface SubjectRef {
  id: string;
  name: string;
}

export interface TeacherRef {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
}
```

## `LessonItem`

```ts
export interface LessonItem {
  id: string;
  startsAt: string;
  endsAt: string;
  room?: string | null;
  subject: SubjectRef;
  group?: Group | { id: string; name: string };
  teacher: TeacherRef;
}
```

Используется в:
- `GET /schedule/week`
- `GET /schedule/day`
- `DashboardResponse.todaySchedule`

## Dashboard

```ts
export interface DashboardResponse {
  averageGrade: number | null;
  lessonsToday: number;
  unreadNotifications: number;
  todaySchedule: LessonItem[];
}
```

## Subjects

```ts
export interface SubjectListItem {
  id: string;
  name: string;
  groupId: string;
  teacherId: string;
  group?: { id: string; name: string };
  teacher?: TeacherRef;
  createdAt?: string;
  updatedAt?: string;
}
```

```ts
export interface CreateSubjectRequest {
  name: string;
  groupId: string;
  teacherId: string;
}

export interface UpdateSubjectRequest {
  name?: string;
  groupId?: string;
  teacherId?: string;
}

export interface SubjectsQueryParams {
  groupId?: string;
  teacherId?: string;
}
```

## Grades

```ts
export interface StudentRef {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
}

export interface GradeItem {
  id: string;
  subjectId: string;
  studentId: string;
  createdById: string;
  value: number;
  comment?: string | null;
  gradedAt: string;
  student?: StudentRef;
  createdBy?: TeacherRef;
  createdAt?: string;
  updatedAt?: string;
}
```

```ts
export interface CreateGradeRequest {
  studentId: string;
  value: number;
  comment?: string;
  gradedAt?: string;
}

export interface UpdateGradeRequest {
  value?: number;
  comment?: string;
  gradedAt?: string;
}
```

### Grade value range

- По бизнес-правилу: `1..5`.
- В UI рекомендуется client-side проверка до отправки запроса.

## Schedule request types

```ts
export interface CreateLessonRequest {
  subjectId: string;
  startsAt: string;
  endsAt: string;
  room?: string;
}

export interface UpdateLessonRequest {
  subjectId?: string;
  startsAt?: string;
  endsAt?: string;
  room?: string;
}

export interface ScheduleQueryParams {
  date: string;
  groupId?: string;
  teacherId?: string;
}
```

---

## 6) Notifications and Settings

## Notifications

```ts
export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  status: NotificationStatus;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsListResponse {
  items: NotificationItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface NotificationsQueryParams {
  status?: NotificationFilterStatus;
  page?: number;
  limit?: number;
}

export interface NotificationsReadAllResponse {
  updated: number;
}
```

### Pagination contract

- `page` starts from `1`.
- `limit` max `100`.
- Для бесконечного скролла используйте `page < totalPages`.

## Settings

```ts
export interface NotificationsSettings {
  enabled?: boolean;
  grades?: boolean;
  homework?: boolean;
  announcements?: boolean;
}

export interface SettingsResponse {
  themeMode: ThemeMode;
  notifications: NotificationsSettings;
}

export interface UpdateSettingsRequest {
  themeMode?: ThemeMode;
  notifications?: NotificationsSettings;
}
```

---

## 7) Error Type and Handling

```ts
export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  path?: string;
  timestamp?: string;
  requestId?: string;
}
```

### Recommended frontend error parser

1. Если `message` — массив, объединяйте в список валидационных ошибок.
2. Если `message` — строка, показывайте как основной текст ошибки.
3. Логируйте `requestId` и `path` для диагностики.

Пример:

```json
{
  "statusCode": 400,
  "message": ["groupId must be a UUID", "name should not be empty"],
  "error": "Bad Request",
  "path": "/api/v1/subjects",
  "timestamp": "2026-03-27T10:22:35.001Z",
  "requestId": "4de4f8b1-3b6e-4ed5-b8fe-fadce31cfec0"
}
```

---

## 8) Endpoint-to-Type Matrix

Ниже быстрый справочник "что отправлять / что получать".

## Auth

- `POST /auth/login`
  - request: `LoginRequest`
  - response: `AuthResponse`
- `POST /auth/refresh`
  - request: `RefreshRequest`
  - response: `AuthResponse`
- `POST /auth/logout`
  - request: `LogoutRequest`
  - response: `LogoutResponse`

## Users

- `GET /users/me`
  - response: `User`
- `PATCH /users/me`
  - request: `UpdateMeRequest`
  - response: `User`
- `POST /users` (admin)
  - request: `CreateUserByAdminRequest`
  - response: `User`
- `PATCH /users/:id` (admin)
  - request: `UpdateUserByAdminRequest`
  - response: `User`

## Groups

- `GET /groups`
  - response: `GroupListItem[]`
- `POST /groups` (admin)
  - request: `CreateGroupRequest`
  - response: `GroupListItem`

## Subjects and Grades

- `GET /subjects`
  - query: `SubjectsQueryParams`
  - response: `SubjectListItem[]`
- `POST /subjects` (admin)
  - request: `CreateSubjectRequest`
  - response: `SubjectListItem`
- `PATCH /subjects/:id` (admin)
  - request: `UpdateSubjectRequest`
  - response: `SubjectListItem`
- `GET /subjects/:id/grades`
  - response: `GradeItem[]`
- `POST /subjects/:id/grades`
  - request: `CreateGradeRequest`
  - response: `GradeItem`
- `PATCH /grades/:id`
  - request: `UpdateGradeRequest`
  - response: `GradeItem`

## Schedule and Dashboard

- `GET /schedule/week`
  - query: `ScheduleQueryParams`
  - response: `LessonItem[]`
- `GET /schedule/day`
  - query: `ScheduleQueryParams`
  - response: `LessonItem[]`
- `POST /schedule`
  - request: `CreateLessonRequest`
  - response: `LessonItem`
- `PATCH /schedule/:id`
  - request: `UpdateLessonRequest`
  - response: `LessonItem`
- `GET /dashboard`
  - response: `DashboardResponse`

## Notifications and Settings

- `GET /notifications`
  - query: `NotificationsQueryParams`
  - response: `NotificationsListResponse`
- `PATCH /notifications/read-all`
  - response: `NotificationsReadAllResponse`
- `GET /settings`
  - response: `SettingsResponse`
- `PATCH /settings`
  - request: `UpdateSettingsRequest`
  - response: `SettingsResponse`

---

## 9) Frontend Integration Notes

- Используйте `frontend-types.ts` как single source of truth.
- Не дублируйте enum-ы вручную в нескольких файлах фронта.
- Для legacy-кода, где встречаются `classId/className`, делайте миграцию:
  - `classId -> groupId`
  - `className -> group?.name`
- Делайте мапперы на границе API-клиента (DTO -> UI model), чтобы изменения контракта проще контролировать.

---

## 10) Versioning and Backward Compatibility

- При изменении типов сначала обновляйте:
  1. `frontend-types.ts`
  2. `API_TYPES.md`
  3. `API.md` (если изменились endpoint-ы/поведение)
- Для breaking changes добавляйте временный compatibility-layer на клиенте.

