import { supabase, isSupabaseConfigured } from "./supabase"
import { User } from "../types/database"

export interface ProfileIconOption {
  id: string
  icon: string
  label: string
}

// Background-free (transparent background) profile icons for learners
export const PROFILE_ICON_OPTIONS: ProfileIconOption[] = [
  { id: "scholar", icon: "🎓", label: "Scholar" },
  { id: "rocket", icon: "🚀", label: "Explorer" },
  { id: "star", icon: "🌟", label: "Superstar" },
  { id: "lion", icon: "🦁", label: "Brave Lion" },
  { id: "fox", icon: "🦊", label: "Clever Fox" },
  { id: "owl", icon: "🦉", label: "Wise Owl" },
  { id: "panda", icon: "🐼", label: "Zen Panda" },
  { id: "tiger", icon: "🐯", label: "Tiger" },
  { id: "koala", icon: "🐨", label: "Chill Koala" },
  { id: "lightning", icon: "⚡", label: "Lightning" },
  { id: "target", icon: "🎯", label: "Focus Master" },
  { id: "artist", icon: "🎨", label: "Creative" },
  { id: "cat", icon: "🐱", label: "Cool Cat" },
  { id: "dog", icon: "🐶", label: "Loyal Pup" },
  { id: "robot", icon: "🤖", label: "Tech Bot" },
  { id: "ninja", icon: "🥷", label: "Ninja" },
  { id: "crown", icon: "👑", label: "Champion" },
  { id: "wizard", icon: "🧙", label: "Wizard" },
  { id: "superhero", icon: "🦸", label: "Hero" },
  { id: "dolphin", icon: "🐬", label: "Dolphin" },
  { id: "eagle", icon: "🦅", label: "Eagle" },
  { id: "unicorn", icon: "🦄", label: "Unicorn" },
  { id: "fire", icon: "🔥", label: "On Fire" },
  { id: "gem", icon: "💎", label: "Diamond" },
]

const STORAGE_KEY = "learn_english_user_icons"

function getIconsMap(): Record<number, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveIconsMap(map: Record<number, string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
    window.dispatchEvent(new CustomEvent("learn_english_profile_icons_updated"))
  } catch {
    // ignore
  }
}

export function getUserProfileIcon(user?: Partial<User> | { id?: number; name?: string; profile_icon?: string } | null): string {
  if (!user || !user.id) return "🎓"

  // 1. Direct field on user object
  if (user.profile_icon) return user.profile_icon

  // 2. From cached map
  const map = getIconsMap()
  if (map[user.id]) return map[user.id]

  // 3. Deterministic fallback based on user id so every user always has a distinct icon
  const idx = Math.abs(user.id) % PROFILE_ICON_OPTIONS.length
  return PROFILE_ICON_OPTIONS[idx].icon
}

export async function saveUserProfileIcon(userId: number, icon: string): Promise<void> {
  const map = getIconsMap()
  map[userId] = icon
  saveIconsMap(map)

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Update in action_text_rich_texts for reliable persistence
      const { data: existing } = await supabase
        .from("action_text_rich_texts")
        .select("id")
        .eq("record_type", "ProfileIcon")
        .eq("record_id", userId)
        .eq("name", "icon")
        .maybeSingle()

      if (existing?.id) {
        await supabase
          .from("action_text_rich_texts")
          .update({ body: icon, updated_at: new Date().toISOString() })
          .eq("id", existing.id)
      } else {
        await supabase.from("action_text_rich_texts").insert({
          record_type: "ProfileIcon",
          record_id: userId,
          name: "icon",
          body: icon,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    } catch (e) {
      console.warn("Could not persist profile icon in Supabase:", e)
    }
  }
}

export async function fetchAllUserProfileIcons(): Promise<Record<number, string>> {
  const map = getIconsMap()

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("action_text_rich_texts")
        .select("record_id, body")
        .eq("record_type", "ProfileIcon")
        .eq("name", "icon")

      if (!error && data) {
        for (const item of data) {
          if (item.record_id && item.body) {
            map[item.record_id] = item.body
          }
        }
        saveIconsMap(map)
      }
    } catch {
      // ignore
    }
  }

  return map
}

// Initial fetch on module load
fetchAllUserProfileIcons()

