import { supabase, isSupabaseConfigured } from "./supabase"

export type ActivityAction = "signup" | "login" | "create" | "update" | "destroy"
export type ActivityResource = "auth" | "note" | "comment" | "lesson" | "chat" | "user" | "reaction"

export interface ActivityRecord {
  id: string
  user_id: number
  user_name: string
  user_email: string
  user_role: number
  action: ActivityAction
  resource_type: ActivityResource
  resource_id?: string | number
  resource_title?: string
  details: string
  created_at: string
}

const STORAGE_KEY = "learn_english_activity_history"

function getLocalHistory(): ActivityRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as ActivityRecord[]
  } catch {
    return []
  }
}

function saveLocalHistory(records: ActivityRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 300)))
    window.dispatchEvent(new CustomEvent("learn_english_activity_logged"))
  } catch (e) {
    console.warn("Could not persist activity history:", e)
  }
}

export async function logActivity(
  entry: Omit<ActivityRecord, "id" | "created_at">
): Promise<void> {
  const newRecord: ActivityRecord = {
    ...entry,
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
  }

  // 1. Save locally
  const local = getLocalHistory()
  saveLocalHistory([newRecord, ...local])

  // 2. Persist to Supabase action_text_rich_texts
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("action_text_rich_texts").insert({
        record_type: "ActivityLog",
        record_id: entry.user_id,
        name: `${entry.resource_type}:${entry.action}`,
        body: JSON.stringify(newRecord),
        created_at: newRecord.created_at,
        updated_at: newRecord.created_at,
      })
    } catch (e) {
      console.warn("Could not sync activity log to Supabase:", e)
    }
  }
}

export async function fetchActivityHistory(options?: {
  userId?: number | null
  resourceType?: string
  action?: string
  search?: string
}): Promise<ActivityRecord[]> {
  const local = getLocalHistory()
  let list = [...local]

  // Also query from Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase
        .from("action_text_rich_texts")
        .select("*")
        .eq("record_type", "ActivityLog")
        .order("created_at", { ascending: false })
        .limit(100)

      if (options?.userId) {
        query = query.eq("record_id", options.userId)
      }

      const { data, error } = await query
      if (!error && data) {
        const fromDb: ActivityRecord[] = []
        for (const item of data) {
          try {
            if (item.body) {
              const parsed = JSON.parse(item.body) as ActivityRecord
              if (parsed && parsed.action) {
                fromDb.push(parsed)
              }
            }
          } catch {
            // ignore malformed
          }
        }

        // Merge and deduplicate by id
        const seen = new Set<string>()
        const merged: ActivityRecord[] = []
        for (const r of [...list, ...fromDb]) {
          if (!seen.has(r.id)) {
            seen.add(r.id)
            merged.push(r)
          }
        }
        list = merged
      }
    } catch (e) {
      console.warn("Error fetching activity logs from database:", e)
    }
  }

  // Filter in memory
  if (options?.userId) {
    list = list.filter((r) => r.user_id === options.userId)
  }

  if (options?.resourceType && options.resourceType !== "all") {
    list = list.filter((r) => r.resource_type === options.resourceType)
  }

  if (options?.action && options.action !== "all") {
    list = list.filter((r) => r.action === options.action)
  }

  if (options?.search) {
    const q = options.search.toLowerCase()
    list = list.filter(
      (r) =>
        r.user_name.toLowerCase().includes(q) ||
        r.user_email.toLowerCase().includes(q) ||
        r.details.toLowerCase().includes(q) ||
        (r.resource_title && r.resource_title.toLowerCase().includes(q))
    )
  }

  return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

