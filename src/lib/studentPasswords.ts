import { supabase, isSupabaseConfigured } from "./supabase"

const STORAGE_KEY = "learn_english_student_passwords"

export function getCachedStudentPasswords(): Record<number, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<number, string>
  } catch {
    return {}
  }
}

export function cacheStudentPassword(userId: number, rawPassword: string) {
  try {
    const map = getCachedStudentPasswords()
    map[userId] = rawPassword
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch (e) {
    console.warn("Could not cache student password:", e)
  }
}

export async function saveStudentPassword(userId: number, rawPassword: string): Promise<void> {
  cacheStudentPassword(userId, rawPassword)

  if (isSupabaseConfigured && supabase) {
    try {
      // Check if existing record
      const { data: existing } = await supabase
        .from("action_text_rich_texts")
        .select("id")
        .eq("record_type", "UserPassword")
        .eq("record_id", userId)
        .eq("name", "password")
        .maybeSingle()

      if (existing?.id) {
        await supabase
          .from("action_text_rich_texts")
          .update({
            body: rawPassword,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
      } else {
        await supabase.from("action_text_rich_texts").insert({
          record_type: "UserPassword",
          record_id: userId,
          name: "password",
          body: rawPassword,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    } catch (err) {
      console.warn("Failed to persist student password in database:", err)
    }
  }
}

export async function fetchAllStudentPasswords(): Promise<Record<number, string>> {
  const result: Record<number, string> = { ...getCachedStudentPasswords() }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("action_text_rich_texts")
        .select("record_id, body")
        .eq("record_type", "UserPassword")
        .eq("name", "password")

      if (!error && data) {
        for (const item of data) {
          if (item.record_id && item.body) {
            result[item.record_id] = item.body
            cacheStudentPassword(item.record_id, item.body)
          }
        }
      }
    } catch (e) {
      console.warn("Error fetching student passwords from database:", e)
    }
  }

  return result
}

