# GradeBook Backend Integration Guide

**Для фронта**

## Базовая информация

- **Base URL**: `http://localhost:3000`
- **API prefix**: `/api/v1` (в production)
- **Content-Type**: `application/json`
- **Timezone**: `Europe/Moscow` (все даты приходят в UTC)
- **Date format**: ISO 8601 (`2026-02-21T16:00:00.000Z`)

## Аутентификация

### Схема безопасности
- **Opaque tokens** (не JWT) - более безопасно для мобильных приложений
- **Stateful sessions** хранятся в БД
- **Refresh token rotation** - каждый refresh инвалидирует предыдущий токен
- **Access token**: живёт 15 минут
- **Refresh token**: живёт 30 дней

### Заголовки для защищённых запросов
```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

---

## API Endpoints

### 🔐 Аутентификация

#### POST `/api/v1/auth/login`
```javascript
const response = await fetch('http://localhost:3000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    login: 'student.a',
    password: 'Password123!'
  })
});

// Response 200
{
  accessToken: 'u8tp_BA5M0mGT41j-Lm9M8mQ...',
  refreshToken: 'x9vR_N3kF7mC5kJ8-Pw6L2hQ...',
  expiresIn: 900, // секунды
  user: {
    id: 'uuid',
    login: 'student.a',
    role: 'student',
    firstName: 'Nikita',
    lastName: 'Ivanov',
    middleName: null,
    classRoom: {
      id: 'uuid',
      name: '10A',
      course: 10,
      groupName: 'A'
    },
    createdAt: '2026-02-21T16:00:00.000Z',
    updatedAt: '2026-02-21T16:00:00.000Z'
  }
}
```

#### POST `/api/v1/auth/refresh`
```javascript
const response = await fetch('http://localhost:3000/api/v1/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    refreshToken: storedRefreshToken
  })
});
// Response: такая же структура как у login
```

#### POST `/api/v1/auth/logout`
```javascript
await fetch('http://localhost:3000/api/v1/auth/logout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    refreshToken: storedRefreshToken
  })
});
// Response: { success: true }
```

---

### 👤 Пользователь

#### GET `/api/v1/users/me`
```javascript
const response = await fetch('http://localhost:3000/api/v1/users/me', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
// Response: user object (как в login)
```

#### PATCH `/api/v1/users/me`
```javascript
await fetch('http://localhost:3000/api/v1/users/me', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    firstName: 'Новое имя',
    lastName: 'Новая фамилия',
    middleName: 'Новое отчество' // опционально
  })
});
```

---

### 📊 Dashboard

#### GET `/api/v1/dashboard`
```javascript
const response = await fetch('http://localhost:3000/api/v1/dashboard', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

// Response
{
  averageGrade: 4.5,
  lessonsToday: 3,
  unreadNotifications: 2,
  todaySchedule: [
    {
      id: 'uuid',
      startsAt: '2026-02-21T06:00:00.000Z',
      endsAt: '2026-02-21T06:45:00.000Z',
      room: '101',
      subject: { id: 'uuid', name: 'Mathematics' },
      classRoom: { id: 'uuid', name: '10A', course: 10, groupName: 'A' },
      teacher: { id: 'uuid', firstName: 'Ivan', lastName: 'Petrov', middleName: 'Sergeevich' }
    }
  ]
}
```

---

### 📚 Предметы и оценки

#### GET `/api/v1/subjects`
```javascript
const url = new URL('http://localhost:3000/api/v1/subjects');
// Опциональные фильтры для admin/teacher:
if (classRoomId) url.searchParams.set('classRoomId', classRoomId);
if (teacherId) url.searchParams.set('teacherId', teacherId);

const response = await fetch(url, {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
// Response: массив предметов
```

#### GET `/api/v1/subjects/:id/grades`
```javascript
const response = await fetch(`http://localhost:3000/api/v1/subjects/${subjectId}/grades`, {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
// Response: массив оценок с student/teacher информацией
```

#### POST `/api/v1/subjects/:id/grades` (teacher/admin)
```javascript
await fetch(`http://localhost:3000/api/v1/subjects/${subjectId}/grades`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    studentId: 'uuid',
    value: 5, // 1-5
    comment: 'Отличная работа',
    gradedAt: new Date().toISOString() // опционально, по умолчанию сейчас
  })
});
```

---

### 📅 Расписание

#### GET `/api/v1/schedule/week?date=YYYY-MM-DD`
```javascript
const date = '2026-02-21'; // формат YYYY-MM-DD
const url = new URL(`http://localhost:3000/api/v1/schedule/week`);
url.searchParams.set('date', date);

// Для admin/teacher - дополнительные фильтры:
if (classRoomId) url.searchParams.set('classRoomId', classRoomId);
if (teacherId) url.searchParams.set('teacherId', teacherId);

const response = await fetch(url, {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
// Response: массив уроков на неделю
```

#### GET `/api/v1/schedule/day?date=YYYY-MM-DD`
```javascript
// Аналогично week, но на один день
```

---

### 🔔 Уведомления

#### GET `/api/v1/notifications`
```javascript
const url = new URL('http://localhost:3000/api/v1/notifications');
url.searchParams.set('status', 'unread'); // all|read|unread
url.searchParams.set('page', '1');
url.searchParams.set('limit', '20'); // max 100

const response = await fetch(url, {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

// Response
{
  items: [...], // массив уведомлений
  page: 1,
  limit: 20,
  total: 42,
  totalPages: 3
}
```

#### PATCH `/api/v1/notifications/:id/read`
```javascript
await fetch(`http://localhost:3000/api/v1/notifications/${notificationId}/read`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

#### PATCH `/api/v1/notifications/read-all`
```javascript
const response = await fetch('http://localhost:3000/api/v1/notifications/read-all', {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
// Response: { updated: 12 }
```

---

### ⚙️ Настройки

#### GET `/api/v1/settings`
```javascript
const response = await fetch('http://localhost:3000/api/v1/settings', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

// Response
{
  themeMode: 'system', // system|light|dark
  notifications: {
    enabled: true,
    grades: true,
    homework: false,
    announcements: true
  }
}
```

#### PATCH `/api/v1/settings`
```javascript
await fetch('http://localhost:3000/api/v1/settings', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    themeMode: 'dark',
    notifications: {
      enabled: true,
      grades: true,
      homework: false,
      announcements: true
    }
  })
});
```

---

### 👑 Admin функции

#### POST `/api/v1/users` (admin)
```javascript
await fetch('http://localhost:3000/api/v1/users', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminAccessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    role: 'student', // student|teacher
    firstName: 'Никита',
    lastName: 'Иванов',
    middleName: 'Петрович', // опционально
    course: 2, // обязательно для student
    group: 'А', // обязательно для student
    login: 'student.c',
    password: 'Password123!'
  })
});
```

#### POST `/api/v1/schedule` (admin)
```javascript
await fetch('http://localhost:3000/api/v1/schedule', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminAccessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    subjectId: 'uuid',
    startsAt: '2026-02-21T08:00:00.000Z',
    endsAt: '2026-02-21T08:45:00.000Z',
    room: '101'
  })
});
```

---

## 🚨 Обработка ошибок

### Стандартный формат ошибок
```javascript
{
  statusCode: 401,
  timestamp: '2026-02-21T17:00:00.000Z',
  path: '/api/v1/users/me',
  message: 'Access token is missing',
  requestId: 'uuid'
}
```

### Основные статус-коды
- `200` - Успех
- `201` - Создано
- `400` - Плохой запрос (невалидные данные)
- `401` - Не авторизован (нет токена/токен просрочен)
- `403` - Запрещено (недостаточно прав)
- `404` - Не найдено
- `409` - Конфликт (логин уже занят)
- `429` - Слишком много запросов (rate limit)
- `500` - Внутренняя ошибка сервера

---

## 📱 React Native специфика

### Token storage
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Сохранение токенов
await AsyncStorage.setItem('accessToken', accessToken);
await AsyncStorage.setItem('refreshToken', refreshToken);

// Получение токенов
const accessToken = await AsyncStorage.getItem('accessToken');
const refreshToken = await AsyncStorage.getItem('refreshToken');
```

### Automatic token refresh
```javascript
class ApiClient {
  async request(url, options = {}) {
    let accessToken = await AsyncStorage.getItem('accessToken');
    
    let response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    // Если токен просрочен, обновляем
    if (response.status === 401) {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      const refreshResponse = await fetch('http://localhost:3000/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      
      if (refreshResponse.ok) {
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await refreshResponse.json();
        await AsyncStorage.setItem('accessToken', newAccessToken);
        await AsyncStorage.setItem('refreshToken', newRefreshToken);
        
        // Повтори оригинальный запрос с новым токеном
        response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Authorization': `Bearer ${newAccessToken}`
          }
        });
      } else {
        // Refresh тоже провалился, нужен logout
        await this.logout();
        throw new Error('Session expired');
      }
    }
    
    return response;
  }
}
```

### Date handling
```javascript
// Для отправки дат на сервер
const isoDate = new Date().toISOString();

// Для показа дат пользователю (конвертировать в локальную timezone)
const localDate = new Date(isoDateTime).toLocaleString('ru-RU', {
  timeZone: 'Europe/Moscow'
});
```

---

## 🧪 Тестовые пользователи

```javascript
// После запуска npm run prisma:seed доступны:
const testUsers = [
  { login: 'admin', password: 'Password123!', role: 'admin' },
  { login: 'teacher.math', password: 'Password123!', role: 'teacher' },
  { login: 'teacher.rus', password: 'Password123!', role: 'teacher' },
  { login: 'student.a', password: 'Password123!', role: 'student' },
  { login: 'student.b', password: 'Password123!', role: 'student' }
];
```

---

## 🔧 Rate Limiting

### Лимиты запросов
- **Общие API**: 100 запросов в минуту
- **Auth endpoints**: 10 запросов в минуту

### Headers в ответе
```javascript
// В каждом ответе приходят headers:
'x-ratelimit-limit': '100',
'x-ratelimit-remaining': '95',
'x-ratelimit-reset': '60' // секунды до сброса
```

---

## 📋 Role-Based Access Control (RBAC)

### Разрешения по ролям

| Действие | student | teacher | admin |
|----------|---------|---------|-------|
| Просмотр своего профиля | ✅ | ✅ | ✅ |
| Просмотр оценок/расписания | ✅ (свой класс) | ✅ (свои предметы) | ✅ (всё) |
| Создание/изменение оценок | ❌ | ✅ (свои предметы) | ✅ |
| Управление расписанием | ❌ | ❌ | ✅ |
| Создание пользователей | ❌ | ❌ | ✅ |

---

## 🌐 Network Error Handling

```javascript
class GradeBookApi {
  async safeRequest(url, options) {
    try {
      const response = await this.request(url, options);
      
      if (!response.ok) {
        const error = await response.json();
        throw new ApiError(error.message, response.status, error);
      }
      
      return response.json();
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new NetworkError('No internet connection');
      }
      throw error;
    }
  }
}

class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NetworkError';
  }
}
```

---

## 📊 Пагинация

```javascript
// Для notifications и других списков
const loadNotifications = async (page = 1, limit = 20) => {
  const url = new URL('http://localhost:3000/api/v1/notifications');
  url.searchParams.set('page', page.toString());
  url.searchParams.set('limit', limit.toString());
  url.searchParams.set('status', 'all'); // all|read|unread
  
  const response = await apiClient.request(url);
  return response.json(); // { items, page, limit, total, totalPages }
};
```

---

## 🚀 Запуск и тестирование

### Development
```bash
# Из папки server/
npm run dev
# API: http://localhost:3000
# Swagger: http://localhost:3000/docs
```

### Production  
```bash
npm run build
npm run start
```

### Тестирование backend
```bash
npm run test      # unit тесты
npm run test:e2e  # полные integration тесты
```

---

## 📚 Полезные ссылки

- **API Documentation**: `server/API.md`
- **Swagger UI**: http://localhost:3000/docs (когда сервер запущен)
- **Database viewer**: `npm run prisma:studio`
- **OpenAPI spec**: http://localhost:3000/docs-json

---

**Happy coding! 🎉**