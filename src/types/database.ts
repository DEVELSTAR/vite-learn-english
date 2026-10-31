// Database Schema Types based on the Rails / Supabase PostgreSQL schema

// User Roles: 0 = student, 1 = admin, 2 = super_admin
export type UserRole = 0 | 1 | 2

export interface User {
  id: number
  name: string
  email_address: string
  password_digest?: string
  role: UserRole
  created_at?: string
  updated_at?: string
}

// Lesson Status: 0 = draft, 1 = published, 2 = archived
export type LessonStatus = 0 | 1 | 2

// Lesson Type: 0 = daily_class, 1 = foundational_topic
export type LessonType = 0 | 1

export interface Lesson {
  id: number
  title: string
  slug: string
  lesson_date: string
  topic?: string | null
  introduction?: string | null
  status: LessonStatus
  author_id?: number | null
  created_at: string
  updated_at: string
  lesson_type: LessonType
  position: number
  // Rich text body joined from action_text_rich_texts table
  content?: string | null
}

export interface ActionTextRichText {
  id: number
  name: string // 'content'
  body: string | null
  record_type: string // 'Lesson'
  record_id: number // lesson id
  created_at: string
  updated_at: string
}

export interface LessonCompletion {
  id: number
  user_id: number
  lesson_id: number
  completed: boolean
  needs_revision: boolean
  completed_at?: string | null
  created_at: string
  updated_at: string
}

export interface LessonComment {
  id: number
  lesson_id: number
  user_id: number
  parent_id?: number | null
  content: string
  created_at: string
  updated_at: string
  user?: Pick<User, "id" | "name" | "email_address" | "role">
  replies?: LessonComment[]
}

export interface LessonChatMessage {
  id: number
  lesson_id: number
  user_id: number
  role: "user" | "assistant" | "model"
  content: string
  created_at: string
  updated_at: string
}

export interface Note {
  id: number
  user_id: number
  content: string
  created_at: string
  updated_at: string
  lesson_id?: number | null
  is_global: boolean
  lesson_title?: string
}

export interface NoteShare {
  id: number
  note_id: number
  user_id: number
  can_edit: boolean
  status: number
  created_at: string
  updated_at: string
}

export interface LessonBlock {
  id: number
  lesson_id: number
  block_type: string
  content: Record<string, any>
  position: number
  created_at: string
  updated_at: string
}
