import { createClient } from "@supabase/supabase-js"
import { Lesson, User, LessonComment, Note, LessonChatMessage, LessonCompletion } from "../types/database"
import { MOCK_LESSONS, MOCK_USERS } from "./mockData"

export function normalizeSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return ""
  return rawUrl.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "")
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL || ""
export const supabaseUrl = normalizeSupabaseUrl(rawUrl)
export const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim()

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes("your-project") &&
  supabaseAnonKey.length > 20
)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Helper to get lesson rich text content from action_text_rich_texts
export async function getLessonContent(lessonId: number): Promise<string> {
  if (!supabase) return ""
  try {
    const { data, error } = await supabase
      .from("action_text_rich_texts")
      .select("body")
      .eq("record_type", "Lesson")
      .eq("record_id", lessonId)
      .eq("name", "content")
      .maybeSingle()

    if (error || !data) return ""
    return data.body || ""
  } catch {
    return ""
  }
}

// Helper to save lesson rich text content
export async function saveLessonContent(lessonId: number, body: string) {
  if (!supabase) return
  try {
    // Check if record exists
    const { data: existing } = await supabase
      .from("action_text_rich_texts")
      .select("id")
      .eq("record_type", "Lesson")
      .eq("record_id", lessonId)
      .eq("name", "content")
      .maybeSingle()

    if (existing?.id) {
      await supabase
        .from("action_text_rich_texts")
        .update({
          body,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
    } else {
      await supabase.from("action_text_rich_texts").insert({
        record_type: "Lesson",
        record_id: lessonId,
        name: "content",
        body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
  } catch (err) {
    console.error("Error saving action_text_rich_texts:", err)
  }
}

// 1. Fetch Lessons / Topics
export async function fetchLessons(options?: {
  lessonType?: 0 | 1 // 0: daily_class, 1: foundational_topic
  status?: 0 | 1     // 0: draft, 1: published
  includeContent?: boolean
}): Promise<Lesson[]> {
  if (!supabase) {
    let filtered = [...MOCK_LESSONS]
    if (options?.lessonType !== undefined) {
      filtered = filtered.filter((l) => l.lesson_type === options.lessonType)
    }
    if (options?.status !== undefined) {
      filtered = filtered.filter((l) => l.status === options.status)
    }
    return filtered
  }

  try {
    let query = supabase.from("lessons").select("*")

    if (options?.lessonType !== undefined) {
      query = query.eq("lesson_type", options.lessonType)
    }
    if (options?.status !== undefined) {
      query = query.eq("status", options.status)
    }

    if (options?.lessonType === 1) {
      query = query.order("position", { ascending: true }).order("created_at", { ascending: true })
    } else {
      query = query.order("lesson_date", { ascending: false }).order("created_at", { ascending: false })
    }

    const { data, error } = await query
    if (error || !data) throw error

    const lessons: Lesson[] = data as Lesson[]

    // Optionally load content from action_text_rich_texts
    if (options?.includeContent) {
      for (const lesson of lessons) {
        const body = await getLessonContent(lesson.id)
        lesson.content = body || lesson.introduction || ""
      }
    }

    return lessons
  } catch (err) {
    console.warn("Using mock lessons due to Supabase query error:", err)
    let filtered = [...MOCK_LESSONS]
    if (options?.lessonType !== undefined) {
      filtered = filtered.filter((l) => l.lesson_type === options.lessonType)
    }
    if (options?.status !== undefined) {
      filtered = filtered.filter((l) => l.status === options.status)
    }
    return filtered
  }
}

// 2. Fetch Single Lesson by Slug (with content & navigation)
export async function fetchLessonBySlug(slug: string): Promise<{
  lesson: Lesson | null
  previousLesson: Pick<Lesson, "title" | "slug" | "lesson_date" | "lesson_type"> | null
  nextLesson: Pick<Lesson, "title" | "slug" | "lesson_date" | "lesson_type"> | null
}> {
  if (!supabase) {
    const lesson = MOCK_LESSONS.find((l) => l.slug === slug) || null
    if (!lesson) return { lesson: null, previousLesson: null, nextLesson: null }
    const siblings = MOCK_LESSONS.filter((l) => l.lesson_type === lesson.lesson_type)
    const idx = siblings.findIndex((l) => l.id === lesson.id)
    return {
      lesson,
      previousLesson: idx > 0 ? siblings[idx - 1] : null,
      nextLesson: idx < siblings.length - 1 ? siblings[idx + 1] : null,
    }
  }

  try {
    const { data: lessonData, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("slug", slug)
      .single()

    if (error || !lessonData) return { lesson: null, previousLesson: null, nextLesson: null }

    const lesson: Lesson = lessonData as Lesson
    const content = await getLessonContent(lesson.id)
    lesson.content = content || lesson.introduction || ""

    // Previous and next lessons
    const isTopic = lesson.lesson_type === 1
    let prevRes = null
    let nextRes = null

    if (isTopic) {
      // Topics ordered by position asc
      prevRes = await supabase
        .from("lessons")
        .select("title, slug, lesson_date, lesson_type")
        .eq("lesson_type", 1)
        .eq("status", 1)
        .lt("position", lesson.position)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle()

      nextRes = await supabase
        .from("lessons")
        .select("title, slug, lesson_date, lesson_type")
        .eq("lesson_type", 1)
        .eq("status", 1)
        .gt("position", lesson.position)
        .order("position", { ascending: true })
        .limit(1)
        .maybeSingle()
    } else {
      // Daily classes ordered by lesson_date desc
      prevRes = await supabase
        .from("lessons")
        .select("title, slug, lesson_date, lesson_type")
        .eq("lesson_type", 0)
        .eq("status", 1)
        .lt("lesson_date", lesson.lesson_date)
        .order("lesson_date", { ascending: false })
        .limit(1)
        .maybeSingle()

      nextRes = await supabase
        .from("lessons")
        .select("title, slug, lesson_date, lesson_type")
        .eq("lesson_type", 0)
        .eq("status", 1)
        .gt("lesson_date", lesson.lesson_date)
        .order("lesson_date", { ascending: true })
        .limit(1)
        .maybeSingle()
    }

    return {
      lesson,
      previousLesson: prevRes?.data || null,
      nextLesson: nextRes?.data || null,
    }
  } catch (err) {
    console.error("Error fetching lesson:", err)
    const fallback = MOCK_LESSONS.find((l) => l.slug === slug) || null
    return { lesson: fallback, previousLesson: null, nextLesson: null }
  }
}

// 3. Save Lesson (Create or Update)
export async function saveLesson(
  lessonData: Partial<Lesson>,
  richBody?: string
): Promise<Lesson> {
  if (!supabase) {
    throw new Error("Supabase is not configured.")
  }

  const isEditing = Boolean(lessonData.id)

  const payload = {
    title: lessonData.title?.trim(),
    slug: lessonData.slug?.trim(),
    lesson_date: lessonData.lesson_date,
    lesson_type: lessonData.lesson_type ?? 0,
    topic: lessonData.topic?.trim() || null,
    introduction: lessonData.introduction?.trim() || null,
    status: lessonData.status ?? 0,
    position: lessonData.position ?? 0,
    updated_at: new Date().toISOString(),
  }

  if (isEditing && lessonData.id) {
    const { data, error } = await supabase
      .from("lessons")
      .update(payload)
      .eq("id", lessonData.id)
      .select()
      .single()

    if (error) throw error

    if (richBody !== undefined) {
      await saveLessonContent(lessonData.id, richBody)
    }

    return data as Lesson
  } else {
    const insertPayload = {
      ...payload,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from("lessons")
      .insert(insertPayload)
      .select()
      .single()

    if (error) throw error

    if (richBody !== undefined && data?.id) {
      await saveLessonContent(data.id, richBody)
    }

    return data as Lesson
  }
}

// 4. Delete Lesson
export async function deleteLesson(lessonId: number): Promise<void> {
  if (!supabase) return

  // Delete associated ActionText body
  await supabase
    .from("action_text_rich_texts")
    .delete()
    .eq("record_type", "Lesson")
    .eq("record_id", lessonId)

  // Delete lesson (cascades foreign keys in db)
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId)
  if (error) throw error
}

// 5. Lesson Completions
export async function getLessonCompletion(
  userId: number,
  lessonId: number
): Promise<LessonCompletion | null> {
  if (!supabase) return null
  try {
    const { data } = await supabase
      .from("lesson_completions")
      .select("*")
      .eq("user_id", userId)
      .eq("lesson_id", lessonId)
      .maybeSingle()
    return data || null
  } catch {
    return null
  }
}

export async function toggleCompletion(
  userId: number,
  lessonId: number,
  field: "completed" | "needs_revision"
): Promise<LessonCompletion> {
  if (!supabase) {
    throw new Error("Supabase is not configured.")
  }

  const existing = await getLessonCompletion(userId, lessonId)

  if (existing) {
    const nextVal = !existing[field]
    const updatePayload: Record<string, any> = {
      [field]: nextVal,
      updated_at: new Date().toISOString(),
    }
    if (field === "completed") {
      updatePayload.completed_at = nextVal ? new Date().toISOString() : null
    }

    const { data, error } = await supabase
      .from("lesson_completions")
      .update(updatePayload)
      .eq("id", existing.id)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    const insertPayload: Record<string, any> = {
      user_id: userId,
      lesson_id: lessonId,
      completed: field === "completed",
      needs_revision: field === "needs_revision",
      completed_at: field === "completed" ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from("lesson_completions")
      .insert(insertPayload)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// 6. Discussion Comments
export async function fetchLessonComments(lessonId: number): Promise<LessonComment[]> {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from("lesson_comments")
      .select("*, user:users(id, name, email_address, role)")
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: true })

    if (error) throw error
    return (data || []) as LessonComment[]
  } catch (err) {
    console.error("Error fetching comments:", err)
    return []
  }
}

export async function postLessonComment(
  lessonId: number,
  userId: number,
  content: string,
  parentId?: number | null
): Promise<LessonComment> {
  if (!supabase) throw new Error("Supabase not configured")

  const { data, error } = await supabase
    .from("lesson_comments")
    .insert({
      lesson_id: lessonId,
      user_id: userId,
      parent_id: parentId || null,
      content: content.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("*, user:users(id, name, email_address, role)")
    .single()

  if (error) throw error
  return data as LessonComment
}

export async function updateLessonComment(
  commentId: number,
  userId: number,
  content: string
): Promise<LessonComment> {
  if (!supabase) throw new Error("Supabase not configured")

  const { data, error } = await supabase
    .from("lesson_comments")
    .update({
      content: content.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", commentId)
    .eq("user_id", userId)
    .select("*, user:users(id, name, email_address, role)")
    .single()

  if (error) throw error
  return data as LessonComment
}

export async function deleteLessonComment(
  commentId: number,
  userId: number
): Promise<void> {
  if (!supabase) return

  // Delete nested replies if any
  try {
    await supabase.from("lesson_comments").delete().eq("parent_id", commentId)
  } catch (e) {
    console.warn("Could not delete child replies:", e)
  }

  const { error } = await supabase
    .from("lesson_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", userId)

  if (error) throw error
}

// 7. Student Notes
export async function fetchUserNotes(userId: number, lessonId?: number | null): Promise<Note[]> {
  if (!supabase) return []
  try {
    let query = supabase.from("notes").select("*").eq("user_id", userId)
    if (lessonId !== undefined && lessonId !== null) {
      query = query.eq("lesson_id", lessonId)
    }
    query = query.order("updated_at", { ascending: false })

    const { data, error } = await query
    if (error) throw error
    return (data || []) as Note[]
  } catch {
    return []
  }
}

export async function saveUserNote(
  userId: number,
  content: string,
  lessonId?: number | null,
  noteId?: number
): Promise<Note> {
  if (!supabase) throw new Error("Supabase not configured")

  if (noteId) {
    const { data, error } = await supabase
      .from("notes")
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", noteId)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) throw error
    return data as Note
  } else {
    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: userId,
        lesson_id: lessonId || null,
        content: content.trim(),
        is_global: !lessonId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data as Note
  }
}

export async function updateUserNote(
  noteId: number,
  userId: number,
  content: string
): Promise<Note> {
  return saveUserNote(userId, content, undefined, noteId)
}

export async function deleteUserNote(noteId: number, userId: number): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from("notes").delete().eq("id", noteId).eq("user_id", userId)
  if (error) throw error
}

// 8. AI Tutor Chat Messages
export async function fetchLessonChatMessages(
  lessonId: number,
  userId: number
): Promise<LessonChatMessage[]> {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from("lesson_chat_messages")
      .select("*")
      .eq("lesson_id", lessonId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })

    if (error) throw error
    return (data || []) as LessonChatMessage[]
  } catch {
    return []
  }
}

export async function saveLessonChatMessage(
  lessonId: number,
  userId: number,
  role: "user" | "assistant" | "model",
  content: string
): Promise<LessonChatMessage> {
  if (!supabase) {
    return {
      id: Date.now(),
      lesson_id: lessonId,
      user_id: userId,
      role,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  const { data, error } = await supabase
    .from("lesson_chat_messages")
    .insert({
      lesson_id: lessonId,
      user_id: userId,
      role,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data as LessonChatMessage
}

export async function updateLessonChatMessage(
  messageId: number,
  userId: number,
  content: string
): Promise<LessonChatMessage> {
  if (!supabase) {
    return {
      id: messageId,
      lesson_id: 0,
      user_id: userId,
      role: "user",
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  const { data, error } = await supabase
    .from("lesson_chat_messages")
    .update({
      content: content.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", messageId)
    .eq("user_id", userId)
    .select()
    .single()

  if (error) throw error
  return data as LessonChatMessage
}

export async function deleteLessonChatMessage(
  messageId: number,
  userId: number
): Promise<void> {
  if (!supabase) return

  const { error } = await supabase
    .from("lesson_chat_messages")
    .delete()
    .eq("id", messageId)
    .eq("user_id", userId)

  if (error) throw error
}

export async function clearLessonChatMessages(
  lessonId: number,
  userId: number
): Promise<void> {
  if (!supabase) return

  const { error } = await supabase
    .from("lesson_chat_messages")
    .delete()
    .eq("lesson_id", lessonId)
    .eq("user_id", userId)

  if (error) throw error
}

