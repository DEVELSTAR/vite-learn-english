import { createClient } from "@supabase/supabase-js"
import { Lesson, User, LessonComment, Note, NoteShare, LessonChatMessage, LessonCompletion } from "../types/database"
import { MOCK_LESSONS, MOCK_USERS } from "./mockData"
import { logActivity } from "./activityHistory"

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
      query = query.order("id", { ascending: true })
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
        lesson.content = body || ""
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

// 2. Fetch Single Lesson by ID (with content & navigation)
export async function fetchLessonById(id: number | string): Promise<{
  lesson: Lesson | null
  previousLesson: Pick<Lesson, "id" | "title" | "lesson_date" | "lesson_type"> | null
  nextLesson: Pick<Lesson, "id" | "title" | "lesson_date" | "lesson_type"> | null
}> {
  const numericId = Number(id)
  if (!supabase) {
    const lesson = MOCK_LESSONS.find((l) => l.id === numericId) || null
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
      .eq("id", numericId)
      .single()

    if (error || !lessonData) return { lesson: null, previousLesson: null, nextLesson: null }

    const lesson: Lesson = lessonData as Lesson
    const content = await getLessonContent(lesson.id)
    lesson.content = content || ""

    // Previous and next lessons
    const isTopic = lesson.lesson_type === 1
    let prevRes = null
    let nextRes = null

    if (isTopic) {
      // Topics ordered by id asc
      prevRes = await supabase
        .from("lessons")
        .select("id, title, lesson_date, lesson_type")
        .eq("lesson_type", 1)
        .eq("status", 1)
        .lt("id", lesson.id)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle()

      nextRes = await supabase
        .from("lessons")
        .select("id, title, lesson_date, lesson_type")
        .eq("lesson_type", 1)
        .eq("status", 1)
        .gt("id", lesson.id)
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle()
    } else {
      // Daily classes ordered by lesson_date desc
      prevRes = await supabase
        .from("lessons")
        .select("id, title, lesson_date, lesson_type")
        .eq("lesson_type", 0)
        .eq("status", 1)
        .lt("lesson_date", lesson.lesson_date)
        .order("lesson_date", { ascending: false })
        .limit(1)
        .maybeSingle()

      nextRes = await supabase
        .from("lessons")
        .select("id, title, lesson_date, lesson_type")
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
    const fallback = MOCK_LESSONS.find((l) => l.id === numericId) || null
    return { lesson: fallback, previousLesson: null, nextLesson: null }
  }
}

export const fetchLessonBySlug = fetchLessonById

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
    lesson_date: lessonData.lesson_date,
    lesson_type: lessonData.lesson_type ?? 0,
    topic: lessonData.topic?.trim() || null,
    status: lessonData.status ?? 0,
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
  if (!supabase) {
    try {
      const raw = localStorage.getItem("learn_english_mock_completions")
      const list: LessonCompletion[] = raw ? JSON.parse(raw) : []
      return list.find((c) => c.user_id === userId && c.lesson_id === lessonId) || null
    } catch {
      return null
    }
  }
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

export async function fetchUserCompletions(userId: number): Promise<LessonCompletion[]> {
  if (!supabase) {
    try {
      const raw = localStorage.getItem("learn_english_mock_completions")
      const list: LessonCompletion[] = raw ? JSON.parse(raw) : []
      return list.filter((c) => c.user_id === userId)
    } catch {
      return []
    }
  }
  try {
    const { data, error } = await supabase
      .from("lesson_completions")
      .select("*")
      .eq("user_id", userId)
    if (error) throw error
    return (data || []) as LessonCompletion[]
  } catch (err) {
    console.error("fetchUserCompletions error:", err)
    return []
  }
}

export async function toggleCompletion(
  userId: number,
  lessonId: number,
  field: "completed" | "needs_revision",
  user?: Pick<User, "id" | "name" | "email_address" | "role"> | null
): Promise<LessonCompletion> {
  let existing: LessonCompletion | null = null
  if (supabase) {
    existing = await getLessonCompletion(userId, lessonId)
  }

  const prevVal = existing ? Boolean(existing[field]) : false
  const nextVal = !prevVal
  const label = field === "completed" ? "Completed status" : "Needs Revision flag"

  let result: LessonCompletion

  if (!supabase) {
    const raw = localStorage.getItem("learn_english_mock_completions")
    let list: LessonCompletion[] = []
    try {
      list = raw ? JSON.parse(raw) : []
    } catch {
      list = []
    }
    const idx = list.findIndex((c) => c.user_id === userId && c.lesson_id === lessonId)
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        [field]: !list[idx][field],
        ...(field === "completed" ? { completed_at: !list[idx].completed ? new Date().toISOString() : null } : {}),
        updated_at: new Date().toISOString(),
      }
      result = list[idx]
    } else {
      result = {
        id: Date.now(),
        user_id: userId,
        lesson_id: lessonId,
        completed: field === "completed",
        needs_revision: field === "needs_revision",
        completed_at: field === "completed" ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      list.push(result)
    }
    try {
      localStorage.setItem("learn_english_mock_completions", JSON.stringify(list))
    } catch {
      // ignore
    }
  } else if (existing) {
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
    result = data as LessonCompletion
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
    result = data as LessonCompletion
  }

  logActivity({
    user_id: userId,
    user_name: user?.name || "Student",
    user_email: user?.email_address || "",
    user_role: user?.role ?? 0,
    action: "update",
    resource_type: "lesson",
    resource_id: lessonId,
    resource_title: `Lesson #${lessonId}`,
    details: `Updated lesson #${lessonId} ${label}: ${prevVal} ➔ ${nextVal}`,
    old_value: String(prevVal),
    new_value: String(nextVal),
  })

  return result
}

// 6. Discussion Comments
let MOCK_COMMENTS: LessonComment[] = [
  {
    id: 1,
    lesson_id: 1,
    user_id: 3,
    content: "Akib Sir, how do we politely say 'give me coffee'?",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    user: { id: 3, name: "Aman Sharma", email_address: "aman@example.com", role: 0 },
  },
]

export async function fetchLessonComments(lessonId: number): Promise<LessonComment[]> {
  if (!supabase) {
    return MOCK_COMMENTS.filter((c) => c.lesson_id === lessonId)
  }
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
    return MOCK_COMMENTS.filter((c) => c.lesson_id === lessonId)
  }
}

export async function postLessonComment(
  lessonId: number,
  userId: number,
  content: string,
  parentId?: number | null,
  user?: Pick<User, "id" | "name" | "email_address" | "role"> | null
): Promise<LessonComment> {
  const trimmed = content.trim()
  let result: LessonComment

  if (!supabase) {
    result = {
      id: Date.now(),
      lesson_id: lessonId,
      user_id: userId,
      parent_id: parentId || null,
      content: trimmed,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: user || MOCK_USERS.find((u) => u.id === userId),
    }
    MOCK_COMMENTS.push(result)
  } else {
    const { data, error } = await supabase
      .from("lesson_comments")
      .insert({
        lesson_id: lessonId,
        user_id: userId,
        parent_id: parentId || null,
        content: trimmed,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("*, user:users(id, name, email_address, role)")
      .single()

    if (error) throw error
    result = data as LessonComment
  }

  logActivity({
    user_id: userId,
    user_name: user?.name || result.user?.name || "Student",
    user_email: user?.email_address || result.user?.email_address || "",
    user_role: user?.role ?? result.user?.role ?? 0,
    action: "create",
    resource_type: "comment",
    resource_id: result.id,
    resource_title: `Lesson #${lessonId}`,
    details: parentId
      ? `Posted reply to comment #${parentId} on lesson #${lessonId}: "${trimmed}"`
      : `Posted discussion comment on lesson #${lessonId}: "${trimmed}"`,
    new_value: trimmed,
  })

  return result
}

export async function updateLessonComment(
  commentId: number,
  userId: number,
  content: string,
  user?: Pick<User, "id" | "name" | "email_address" | "role"> | null
): Promise<LessonComment> {
  const trimmed = content.trim()
  let oldContent = ""
  let result: LessonComment

  if (!supabase) {
    const found = MOCK_COMMENTS.find((c) => c.id === commentId)
    if (found) {
      oldContent = found.content
      found.content = trimmed
      found.updated_at = new Date().toISOString()
      result = found
    } else {
      result = {
        id: commentId,
        lesson_id: 1,
        user_id: userId,
        content: trimmed,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: user || undefined,
      }
    }
  } else {
    try {
      const { data: prev } = await supabase
        .from("lesson_comments")
        .select("content")
        .eq("id", commentId)
        .maybeSingle()
      if (prev) oldContent = prev.content
    } catch (e) {
      console.warn("Could not fetch old comment content:", e)
    }

    const { data, error } = await supabase
      .from("lesson_comments")
      .update({
        content: trimmed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId)
      .eq("user_id", userId)
      .select("*, user:users(id, name, email_address, role)")
      .single()

    if (error) throw error
    result = data as LessonComment
  }

  logActivity({
    user_id: userId,
    user_name: user?.name || result.user?.name || "Student",
    user_email: user?.email_address || result.user?.email_address || "",
    user_role: user?.role ?? result.user?.role ?? 0,
    action: "update",
    resource_type: "comment",
    resource_id: commentId,
    resource_title: `Comment #${commentId}`,
    details: oldContent
      ? `Updated discussion comment #${commentId}: "${oldContent}" ➔ "${trimmed}"`
      : `Updated discussion comment #${commentId} to: "${trimmed}"`,
    old_value: oldContent,
    new_value: trimmed,
  })

  return result
}

export async function deleteLessonComment(
  commentId: number,
  userId: number,
  user?: Pick<User, "id" | "name" | "email_address" | "role"> | null
): Promise<void> {
  let oldComment: any = null

  if (!supabase) {
    const found = MOCK_COMMENTS.find((c) => c.id === commentId)
    if (found) {
      oldComment = found
      MOCK_COMMENTS = MOCK_COMMENTS.filter((c) => c.id !== commentId && c.parent_id !== commentId)
    }
  } else {
    try {
      const { data: prev } = await supabase
        .from("lesson_comments")
        .select("*, user:users(id, name, email_address, role)")
        .eq("id", commentId)
        .maybeSingle()
      oldComment = prev
    } catch (e) {
      console.warn("Could not fetch old comment before delete:", e)
    }

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

  const authorName = user?.name || oldComment?.user?.name || "Student"
  const authorEmail = user?.email_address || oldComment?.user?.email_address || ""
  const authorRole = user?.role ?? oldComment?.user?.role ?? 0
  const deletedText = oldComment?.content || ""

  logActivity({
    user_id: userId,
    user_name: authorName,
    user_email: authorEmail,
    user_role: authorRole,
    action: "destroy",
    resource_type: "comment",
    resource_id: commentId,
    resource_title: oldComment?.lesson_id ? `Lesson #${oldComment.lesson_id}` : `Comment #${commentId}`,
    details: deletedText
      ? `Deleted discussion comment #${commentId}${oldComment?.lesson_id ? ` on lesson #${oldComment.lesson_id}` : ""}: "${deletedText}"`
      : `Deleted discussion comment #${commentId}`,
    old_value: deletedText,
  })
}

// 7. Student Notes & Sharing System

let MOCK_NOTES: Note[] = [
  {
    id: 1,
    user_id: 3,
    content: "Remember: 'Revert back' is redundant. Just say 'I will revert tomorrow' or 'I will get back to you'.",
    lesson_id: 1,
    is_global: true,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    user: { id: 3, name: "Aman Sharma", email_address: "aman@example.com", role: 0 },
    lesson: { id: 1, title: "Everyday Hinglish to Fluent English", lesson_type: 0 },
    note_shares: [],
  },
  {
    id: 2,
    user_id: 1,
    content: "Tip for ordering at cafes: 'Can I have...' sounds much more polite than 'I want...'",
    lesson_id: 2,
    is_global: true,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    user: { id: 1, name: "Super Admin", email_address: "star@gmail.com", role: 2 },
    lesson: { id: 2, title: "Ordering Food & Coffee Naturally", lesson_type: 0 },
    note_shares: [],
  },
]

function filterMockNotes(
  currentUserId?: number | null,
  options?: {
    filter?: "all" | "mine" | "shared" | "lesson" | "general"
    lessonId?: number | null
    isSuperAdmin?: boolean
  }
): Note[] {
  const filter = options?.filter || "all"
  const lessonId = options?.lessonId
  const isSuperAdmin = Boolean(options?.isSuperAdmin)

  let list = [...MOCK_NOTES]

  if (lessonId !== undefined && lessonId !== null) {
    list = list.filter((n) => n.lesson_id === lessonId)
  }

  if (filter === "mine") {
    return currentUserId ? list.filter((n) => n.user_id === currentUserId) : []
  }

  if (filter === "shared") {
    return currentUserId
      ? list.filter((n) =>
          n.note_shares?.some((s) => s.user_id === currentUserId && s.status === 1)
        )
      : []
  }

  if (filter === "general") {
    list = list.filter((n) => !n.lesson_id)
  } else if (filter === "lesson" && (lessonId === undefined || lessonId === null)) {
    list = list.filter((n) => Boolean(n.lesson_id))
  }

  if (!isSuperAdmin) {
    if (currentUserId) {
      list = list.filter(
        (n) =>
          n.is_global ||
          n.user_id === currentUserId ||
          n.note_shares?.some((s) => s.user_id === currentUserId && s.status === 1)
      )
    } else {
      list = list.filter((n) => n.is_global)
    }
  }

  return list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
}

export function canEditNote(note: Note, user: User | null): boolean {
  if (!user) return false
  if (user.role === 2) return true // Super Admin can edit all
  if (note.user_id === user.id) return true // Creator can edit
  // Collaborator with accepted invitation and can_edit = true
  return Boolean(
    note.note_shares?.some(
      (s) => s.user_id === user.id && s.status === 1 && s.can_edit === true
    )
  )
}

export function canDeleteNote(note: Note, user: User | null): boolean {
  if (!user) return false
  return user.role === 2 || note.user_id === user.id
}

export async function fetchNoteById(noteId: number): Promise<Note | null> {
  if (!supabase) {
    return MOCK_NOTES.find((n) => n.id === noteId) || null
  }
  try {
    const { data, error } = await supabase
      .from("notes")
      .select("*, user:users(id, name, email_address, role), lesson:lessons(id, title, lesson_type), note_shares(*, user:users(id, name, email_address))")
      .eq("id", noteId)
      .maybeSingle()

    if (error || !data) return null
    return data as Note
  } catch (err) {
    console.error("fetchNoteById error:", err)
    return null
  }
}

export async function fetchVisibleNotes(
  currentUserId?: number | null,
  options?: {
    filter?: "all" | "mine" | "shared" | "lesson" | "general"
    lessonId?: number | null
    isSuperAdmin?: boolean
  }
): Promise<Note[]> {
  const filter = options?.filter || "all"
  const lessonId = options?.lessonId
  const isSuperAdmin = Boolean(options?.isSuperAdmin)

  if (!supabase) {
    return filterMockNotes(currentUserId, options)
  }

  try {
    // 1. Fetch note IDs that were shared with this user and accepted
    let acceptedSharedNoteIds: number[] = []
    if (currentUserId) {
      const { data: shares } = await supabase
        .from("note_shares")
        .select("note_id")
        .eq("user_id", currentUserId)
        .eq("status", 1)

      if (shares && shares.length > 0) {
        acceptedSharedNoteIds = shares.map((s) => s.note_id)
      }
    }

    // 2. Base query
    let query = supabase
      .from("notes")
      .select("*, user:users(id, name, email_address, role), lesson:lessons(id, title, lesson_type), note_shares(*, user:users(id, name, email_address))")

    // Filter by specific lesson if requested
    if (lessonId !== undefined && lessonId !== null) {
      query = query.eq("lesson_id", lessonId)
    }

    // Apply tab filters
    if (filter === "mine") {
      if (!currentUserId) return []
      query = query.eq("user_id", currentUserId)
    } else if (filter === "shared") {
      if (!currentUserId || acceptedSharedNoteIds.length === 0) return []
      query = query.in("id", acceptedSharedNoteIds)
    } else {
      if (filter === "general") {
        query = query.is("lesson_id", null)
      } else if (filter === "lesson" && (lessonId === undefined || lessonId === null)) {
        query = query.not("lesson_id", "is", null)
      }

      // Visibility scoping matching Rails visible_to
      if (!isSuperAdmin) {
        if (currentUserId) {
          if (acceptedSharedNoteIds.length > 0) {
            query = query.or(
              `is_global.eq.true,user_id.eq.${currentUserId},id.in.(${acceptedSharedNoteIds.join(",")})`
            )
          } else {
            query = query.or(`is_global.eq.true,user_id.eq.${currentUserId}`)
          }
        } else {
          query = query.eq("is_global", true)
        }
      }
    }

    query = query.order("updated_at", { ascending: false }).order("created_at", { ascending: false })

    const { data, error } = await query
    if (error) throw error
    return (data || []) as Note[]
  } catch (err) {
    console.warn("fetchVisibleNotes error, using fallback:", err)
    return filterMockNotes(currentUserId, options)
  }
}

export async function fetchPendingNoteShares(userId: number): Promise<NoteShare[]> {
  if (!supabase) return []
  try {
    const { data, error } = await supabase
      .from("note_shares")
      .select("*, note:notes(*, user:users(id, name, email_address, role), lesson:lessons(id, title, lesson_type))")
      .eq("user_id", userId)
      .eq("status", 0)
      .order("created_at", { ascending: false })

    if (error) throw error
    return (data || []) as NoteShare[]
  } catch (err) {
    console.error("fetchPendingNoteShares error:", err)
    return []
  }
}

export async function respondToNoteShare(
  shareId: number,
  status: 1 | 2,
  user?: Pick<User, "id" | "name" | "email_address" | "role"> | null
): Promise<void> {
  let shareInfo: any = null

  if (supabase) {
    try {
      const { data } = await supabase
        .from("note_shares")
        .select("*, note:notes(*)")
        .eq("id", shareId)
        .maybeSingle()
      shareInfo = data
    } catch (e) {
      console.warn("Could not fetch note share info:", e)
    }

    const { error } = await supabase
      .from("note_shares")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", shareId)

    if (error) throw error
  }

  const statusLabel = status === 1 ? "Accepted" : "Declined"
  const noteSnippet = shareInfo?.note?.content ? ` for note: "${shareInfo.note.content.slice(0, 50)}"` : ""

  logActivity({
    user_id: user?.id || shareInfo?.user_id || 0,
    user_name: user?.name || "Student",
    user_email: user?.email_address || "",
    user_role: user?.role ?? 0,
    action: "update",
    resource_type: "note",
    resource_id: shareId,
    details: `Responded to note share invite #${shareId}: status changed to ${statusLabel}${noteSnippet}`,
    old_value: "Pending",
    new_value: statusLabel,
  })
}

export async function fetchAvailableStudents(currentUserId?: number | null): Promise<User[]> {
  if (!supabase) {
    return MOCK_USERS.filter((u) => u.role === 0 && (!currentUserId || u.id !== currentUserId))
  }
  try {
    let query = supabase
      .from("users")
      .select("id, name, email_address, role")
      .eq("role", 0)
      .order("name", { ascending: true })

    if (currentUserId) {
      query = query.neq("id", currentUserId)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []) as User[]
  } catch (err) {
    console.warn("fetchAvailableStudents error, using mock:", err)
    return MOCK_USERS.filter((u) => u.role === 0 && (!currentUserId || u.id !== currentUserId))
  }
}

export async function createNoteWithSharing(
  userId: number,
  payload: {
    content: string
    lessonId?: number | null
    isGlobal: boolean
    inviteUserIds?: number[]
    inviteCanEdit?: boolean
  },
  user?: Pick<User, "id" | "name" | "email_address" | "role"> | null
): Promise<Note> {
  const trimmed = payload.content.trim()
  let resultNote: Note

  if (!supabase) {
    const newNote: Note = {
      id: Date.now(),
      user_id: userId,
      lesson_id: payload.lessonId || null,
      content: trimmed,
      is_global: payload.isGlobal,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: user || MOCK_USERS.find((u) => u.id === userId),
      lesson: payload.lessonId ? MOCK_LESSONS.find((l) => l.id === payload.lessonId) : null,
      note_shares: (payload.inviteUserIds || []).map((uid, idx) => ({
        id: Date.now() + idx,
        note_id: Date.now(),
        user_id: uid,
        can_edit: Boolean(payload.inviteCanEdit),
        status: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: MOCK_USERS.find((u) => u.id === uid),
      })),
    }
    MOCK_NOTES.unshift(newNote)
    resultNote = newNote
  } else {
    const { data: note, error: noteError } = await supabase
      .from("notes")
      .insert({
        user_id: userId,
        lesson_id: payload.lessonId || null,
        content: trimmed,
        is_global: payload.isGlobal,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("*, user:users(id, name, email_address, role), lesson:lessons(id, title, lesson_type)")
      .single()

    if (noteError) throw noteError

    if (!payload.isGlobal && payload.inviteUserIds && payload.inviteUserIds.length > 0) {
      const sharesToInsert = payload.inviteUserIds
        .filter((uid) => uid !== userId)
        .map((uid) => ({
          note_id: note.id,
          user_id: uid,
          can_edit: Boolean(payload.inviteCanEdit),
          status: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))

      if (sharesToInsert.length > 0) {
        await supabase.from("note_shares").insert(sharesToInsert)
      }
    }

    const full = await fetchNoteById(note.id)
    resultNote = full || (note as Note)
  }

  logActivity({
    user_id: userId,
    user_name: user?.name || resultNote.user?.name || "Student",
    user_email: user?.email_address || resultNote.user?.email_address || "",
    user_role: user?.role ?? resultNote.user?.role ?? 0,
    action: "create",
    resource_type: "note",
    resource_id: resultNote.id,
    resource_title: payload.lessonId ? `Lesson #${payload.lessonId}` : "General Note",
    details: `Created study note: "${trimmed}"${payload.lessonId ? ` (attached to lesson #${payload.lessonId})` : " (general)"}`,
    new_value: trimmed,
  })

  return resultNote
}

export async function updateNoteWithSharing(
  noteId: number,
  userId: number,
  payload: {
    content: string
    isGlobal?: boolean
    inviteUserIds?: number[]
    inviteCanEdit?: boolean
  },
  isSuperAdmin = false,
  user?: Pick<User, "id" | "name" | "email_address" | "role"> | null
): Promise<Note> {
  const newContent = payload.content.trim()
  let oldContent = ""
  let resultNote: Note

  if (!supabase) {
    const note = MOCK_NOTES.find((n) => n.id === noteId)
    if (note) {
      oldContent = note.content
      note.content = newContent
      note.updated_at = new Date().toISOString()
      if (payload.isGlobal !== undefined) note.is_global = payload.isGlobal
      resultNote = note
    } else {
      resultNote = {} as Note
    }
  } else {
    const existingNote = await fetchNoteById(noteId)
    if (!existingNote) throw new Error("Note not found")
    oldContent = existingNote.content

    const isOwner = existingNote.user_id === userId
    const canEdit = isOwner || isSuperAdmin || (existingNote.note_shares || []).some(
      (s) => s.user_id === userId && s.status === 1 && s.can_edit === true
    )

    if (!canEdit) throw new Error("You are not authorized to edit this note.")

    const updateFields: Record<string, any> = {
      content: newContent,
      updated_at: new Date().toISOString(),
    }

    if ((isOwner || isSuperAdmin) && payload.isGlobal !== undefined) {
      updateFields.is_global = payload.isGlobal
    }

    const { error: updateError } = await supabase
      .from("notes")
      .update(updateFields)
      .eq("id", noteId)

    if (updateError) throw updateError

    if ((isOwner || isSuperAdmin) && !payload.isGlobal && payload.inviteUserIds && payload.inviteUserIds.length > 0) {
      for (const uid of payload.inviteUserIds) {
        if (uid === userId) continue

        const { data: existingShare } = await supabase
          .from("note_shares")
          .select("id")
          .eq("note_id", noteId)
          .eq("user_id", uid)
          .maybeSingle()

        if (existingShare?.id) {
          await supabase
            .from("note_shares")
            .update({
              can_edit: Boolean(payload.inviteCanEdit),
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingShare.id)
        } else {
          await supabase.from("note_shares").insert({
            note_id: noteId,
            user_id: uid,
            can_edit: Boolean(payload.inviteCanEdit),
            status: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        }
      }
    }

    const refreshed = await fetchNoteById(noteId)
    resultNote = refreshed || existingNote
  }

  const contentChanged = oldContent !== newContent
  const changeDesc = contentChanged ? `"${oldContent}" ➔ "${newContent}"` : `note details updated`

  logActivity({
    user_id: userId,
    user_name: user?.name || resultNote.user?.name || "Student",
    user_email: user?.email_address || resultNote.user?.email_address || "",
    user_role: user?.role ?? resultNote.user?.role ?? 0,
    action: "update",
    resource_type: "note",
    resource_id: noteId,
    resource_title: resultNote.lesson_id ? `Lesson #${resultNote.lesson_id}` : "General Note",
    details: `Updated study note #${noteId}: ${changeDesc}`,
    old_value: oldContent,
    new_value: newContent,
  })

  return resultNote
}

export async function deleteNote(
  noteId: number,
  userId: number,
  isSuperAdmin = false,
  user?: Pick<User, "id" | "name" | "email_address" | "role"> | null
): Promise<void> {
  let existingContent = ""
  let existingUser: any = null
  let lessonId: number | null | undefined = null

  if (!supabase) {
    const existing = MOCK_NOTES.find((n) => n.id === noteId)
    if (existing) {
      existingContent = existing.content
      existingUser = existing.user
      lessonId = existing.lesson_id
      MOCK_NOTES = MOCK_NOTES.filter((n) => n.id !== noteId)
    }
  } else {
    const existing = await fetchNoteById(noteId)
    if (!existing) return
    existingContent = existing.content
    existingUser = existing.user
    lessonId = existing.lesson_id

    if (existing.user_id !== userId && !isSuperAdmin) {
      throw new Error("Only the owner can delete this note.")
    }

    const { error } = await supabase.from("notes").delete().eq("id", noteId)
    if (error) throw error
  }

  logActivity({
    user_id: userId,
    user_name: user?.name || existingUser?.name || "User",
    user_email: user?.email_address || existingUser?.email_address || "",
    user_role: user?.role ?? existingUser?.role ?? 0,
    action: "destroy",
    resource_type: "note",
    resource_id: noteId,
    resource_title: lessonId ? `Lesson #${lessonId}` : "General Note",
    details: existingContent
      ? `Deleted study note #${noteId}: "${existingContent}"`
      : `Deleted study note #${noteId}`,
    old_value: existingContent,
  })
}

// Backward-compatible wrappers
export async function fetchUserNotes(userId: number, lessonId?: number | null): Promise<Note[]> {
  return fetchVisibleNotes(userId, { lessonId: lessonId || undefined, filter: lessonId ? "lesson" : "all" })
}

export async function saveUserNote(
  userId: number,
  content: string,
  lessonId?: number | null,
  noteId?: number
): Promise<Note> {
  if (noteId) {
    return updateNoteWithSharing(noteId, userId, { content })
  }
  return createNoteWithSharing(userId, { content, lessonId, isGlobal: true })
}

export async function updateUserNote(
  noteId: number,
  userId: number,
  content: string
): Promise<Note> {
  return updateNoteWithSharing(noteId, userId, { content })
}

export async function deleteUserNote(noteId: number, userId: number, isSuperAdmin = false): Promise<void> {
  return deleteNote(noteId, userId, isSuperAdmin)
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
  content: string,
  user?: Pick<User, "id" | "name" | "email_address" | "role"> | null
): Promise<LessonChatMessage> {
  const trimmed = content.trim()
  let result: LessonChatMessage

  if (!supabase) {
    result = {
      id: Date.now(),
      lesson_id: lessonId,
      user_id: userId,
      role,
      content: trimmed,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  } else {
    const { data, error } = await supabase
      .from("lesson_chat_messages")
      .insert({
        lesson_id: lessonId,
        user_id: userId,
        role,
        content: trimmed,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    result = data as LessonChatMessage
  }

  if (role === "user") {
    logActivity({
      user_id: userId,
      user_name: user?.name || "Student",
      user_email: user?.email_address || "",
      user_role: user?.role ?? 0,
      action: "create",
      resource_type: "chat",
      resource_id: result.id,
      resource_title: `Lesson #${lessonId}`,
      details: `Sent AI Tutor message on lesson #${lessonId}: "${trimmed}"`,
      new_value: trimmed,
    })
  }

  return result
}

export async function updateLessonChatMessage(
  messageId: number,
  userId: number,
  content: string,
  user?: Pick<User, "id" | "name" | "email_address" | "role"> | null
): Promise<LessonChatMessage> {
  const trimmed = content.trim()
  let oldContent = ""
  let lessonId = 0
  let result: LessonChatMessage

  if (!supabase) {
    result = {
      id: messageId,
      lesson_id: 0,
      user_id: userId,
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  } else {
    try {
      const { data: ex } = await supabase
        .from("lesson_chat_messages")
        .select("content, lesson_id")
        .eq("id", messageId)
        .maybeSingle()
      if (ex) {
        oldContent = ex.content
        lessonId = ex.lesson_id
      }
    } catch {}

    const { data, error } = await supabase
      .from("lesson_chat_messages")
      .update({
        content: trimmed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) throw error
    result = data as LessonChatMessage
  }

  logActivity({
    user_id: userId,
    user_name: user?.name || "Student",
    user_email: user?.email_address || "",
    user_role: user?.role ?? 0,
    action: "update",
    resource_type: "chat",
    resource_id: messageId,
    resource_title: lessonId ? `Lesson #${lessonId}` : `Message #${messageId}`,
    details: oldContent
      ? `Updated AI Tutor message #${messageId}: "${oldContent}" ➔ "${trimmed}"`
      : `Updated AI Tutor message #${messageId} to: "${trimmed}"`,
    old_value: oldContent,
    new_value: trimmed,
  })

  return result
}

export async function deleteLessonChatMessage(
  messageId: number,
  userId: number,
  user?: Pick<User, "id" | "name" | "email_address" | "role"> | null
): Promise<void> {
  let oldContent = ""
  let lessonId: number | undefined

  if (supabase) {
    try {
      const { data: ex } = await supabase
        .from("lesson_chat_messages")
        .select("content, lesson_id")
        .eq("id", messageId)
        .maybeSingle()
      if (ex) {
        oldContent = ex.content
        lessonId = ex.lesson_id
      }
    } catch {}

    const { error } = await supabase
      .from("lesson_chat_messages")
      .delete()
      .eq("id", messageId)
      .eq("user_id", userId)

    if (error) throw error
  }

  logActivity({
    user_id: userId,
    user_name: user?.name || "Student",
    user_email: user?.email_address || "",
    user_role: user?.role ?? 0,
    action: "destroy",
    resource_type: "chat",
    resource_id: messageId,
    resource_title: lessonId ? `Lesson #${lessonId}` : `Message #${messageId}`,
    details: oldContent
      ? `Deleted AI Tutor message #${messageId}: "${oldContent}"`
      : `Deleted AI Tutor message #${messageId}`,
    old_value: oldContent,
  })
}

export async function clearLessonChatMessages(
  lessonId: number,
  userId: number,
  user?: Pick<User, "id" | "name" | "email_address" | "role"> | null
): Promise<void> {
  let msgCount = 0

  if (supabase) {
    try {
      const { count } = await supabase
        .from("lesson_chat_messages")
        .select("*", { count: "exact", head: true })
        .eq("lesson_id", lessonId)
        .eq("user_id", userId)
      msgCount = count || 0
    } catch {}

    const { error } = await supabase
      .from("lesson_chat_messages")
      .delete()
      .eq("lesson_id", lessonId)
      .eq("user_id", userId)

    if (error) throw error
  }

  logActivity({
    user_id: userId,
    user_name: user?.name || "Student",
    user_email: user?.email_address || "",
    user_role: user?.role ?? 0,
    action: "destroy",
    resource_type: "chat",
    resource_title: `Lesson #${lessonId}`,
    details: `Cleared AI Tutor chat history on lesson #${lessonId}${msgCount > 0 ? ` (${msgCount} messages deleted)` : ""}`,
  })
}

