/**
 * Типы API GradeBook Backend для использования на фронте.
 * Base URL: http://localhost:3000 (или ваш хост)
 * Префикс: /api/v1
 * Все даты в формате ISO 8601 (UTC).
 */

// ============ Enums (соответствуют бэкенду) ============

export type Role = 'student' | 'teacher' | 'admin';

export type ThemeMode = 'system' | 'light' | 'dark';

export type NotificationType = 'grade' | 'homework' | 'announcement' | 'system';

export type NotificationStatus = 'unread' | 'read';

/** Фильтр списка уведомлений: all | read | unread */
export type NotificationFilterStatus = 'all' | 'read' | 'unread';

/** Роль при создании пользователя админом (только student | teacher) */
export type CreatableRole = 'student' | 'teacher';

// ============ Auth ============

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

export interface Group {
  id: string;
  name: string;
  course: number;
  groupName: string;
}

/** Пользователь в ответах API. В login/refresh приходит только groupId; в /users/me и ответе создания пользователя может приходить group. */
export interface User {
  id: string;
  login: string;
  role: Role;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  /** Приходит в login/refresh */
  groupId?: string | null;
  /** Приходит в GET/PATCH /users/me и в ответе POST /users (admin) */
  group?: Group | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  /** Время жизни access токена в секундах (например 900) */
  expiresIn: number;
  user: User;
}

export interface LogoutResponse {
  success: boolean;
}

// ============ User (me, admin create) ============

export interface UpdateMeRequest {
  firstName?: string;
  lastName?: string;
  middleName?: string;
}

/** Один предмет при создании учителя: одна группа (groupId) или несколько (groupIds) */
export interface CreateTeacherSubjectItem {
  name: string;
  /** Одна группа. Не указывать, если задан groupIds. */
  groupId?: string;
  /** Несколько групп: один предмет сразу для многих групп. */
  groupIds?: string[];
}

export interface CreateUserByAdminRequest {
  role: CreatableRole;
  firstName: string;
  lastName: string;
  middleName?: string;
  /** Обязательно для student (1–4) */
  course?: number;
  /** Обязательно для student (название или код группы, например 1A) */
  group?: string;
  /** Для teacher: массив предметов (name + groupId или name + groupIds); в админ-панели поле «Предметы» */
  subjects?: CreateTeacherSubjectItem[];
  login: string;
  password: string;
}

// ============ Groups ============

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
  course: number; // 1–4
  groupName: string;
}

// ============ Dashboard ============

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

/** Урок в расписании (schedule/week, schedule/day, dashboard todaySchedule). group в dashboard может быть только { id, name }. */
export interface LessonItem {
  id: string;
  startsAt: string;
  endsAt: string;
  room?: string | null;
  subject: SubjectRef;
  group?: Group | { id: string; name: string };
  teacher: TeacherRef;
}

export interface DashboardResponse {
  averageGrade: number | null;
  lessonsToday: number;
  unreadNotifications: number;
  todaySchedule: LessonItem[];
}

// ============ Subjects ============

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

export interface SubjectsQueryParams {
  groupId?: string;
  teacherId?: string;
}

// ============ Grades ============

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

export interface CreateGradeRequest {
  studentId: string;
  value: number; // 1–5
  comment?: string;
  /** ISO 8601, по умолчанию — сейчас */
  gradedAt?: string;
}

export interface UpdateGradeRequest {
  value?: number; // 1–5
  comment?: string;
  gradedAt?: string;
}

// ============ Schedule ============

export interface CreateLessonRequest {
  subjectId: string;
  startsAt: string; // ISO 8601
  endsAt: string;   // ISO 8601
  room?: string;
}

export interface UpdateLessonRequest {
  subjectId?: string;
  startsAt?: string;
  endsAt?: string;
  room?: string;
}

export interface ScheduleQueryParams {
  /** YYYY-MM-DD */
  date: string;
  groupId?: string;
  teacherId?: string;
}

// ============ Notifications ============

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
  limit?: number; // max 100
}

export interface NotificationsReadAllResponse {
  updated: number;
}

// ============ Settings ============

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

// ============ Errors (стандартный формат бэкенда) ============

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  path?: string;
  timestamp?: string;
  requestId?: string;
}
