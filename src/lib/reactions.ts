import { supabase, isSupabaseConfigured } from "./supabase"

// Reaction storage and real-time live helper service
export type ReactionEmoji = "👍" | "❤️" | "💡" | "👏" | "🔥" | "🎯"

export const AVAILABLE_REACTIONS: ReactionEmoji[] = ["👍", "❤️", "💡", "👏", "🔥", "🎯"]

const STORAGE_KEY = "learn_english_reactions_store"

export interface StoredReactions {
  // key format: `${entityType}:${entityId}` -> { [emoji]: userId[] }
  [key: string]: {
    [emoji: string]: number[]
  }
}

// Multi-tab broadcast channel
let bc: BroadcastChannel | null = null
try {
  if (typeof BroadcastChannel !== "undefined") {
    bc = new BroadcastChannel("learn_english_reactions_channel")
    bc.onmessage = (event) => {
      if (event.data?.type === "reaction_update") {
        const store = getStore()
        store[event.data.key] = event.data.reactions
        saveStore(store, false)
      }
    }
  }
} catch {
  // ignore
}

// Supabase Realtime channel for live cross-user updates
let realtimeChannel: any = null
if (isSupabaseConfigured && supabase) {
  try {
    realtimeChannel = supabase.channel("live_reactions_channel")
    realtimeChannel
      .on("broadcast", { event: "reaction_changed" }, (envelope: any) => {
        const payload = envelope.payload
        if (payload?.key && payload?.reactions) {
          const store = getStore()
          store[payload.key] = payload.reactions
          saveStore(store, false)
        }
      })
      .subscribe()
  } catch (err) {
    console.warn("Could not subscribe to live reactions channel:", err)
  }
}

function getStore(): StoredReactions {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as StoredReactions
  } catch {
    return {}
  }
}

function saveStore(store: StoredReactions, shouldBroadcast = true) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    window.dispatchEvent(new CustomEvent("learn_english_reactions_updated"))
  } catch (e) {
    console.warn("Failed to persist reactions store:", e)
  }
}

// Fetch reactions from database on app start
export async function syncReactionsFromDatabase(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return
  try {
    const { data, error } = await supabase
      .from("action_text_rich_texts")
      .select("name, body")
      .eq("record_type", "Reaction")

    if (!error && data) {
      const store = getStore()
      for (const item of data) {
        try {
          if (item.name && item.body) {
            store[item.name] = JSON.parse(item.body)
          }
        } catch {
          // ignore
        }
      }
      saveStore(store, false)
    }
  } catch {
    // ignore
  }
}

// Run initial sync
syncReactionsFromDatabase()

export function getEntityReactions(
  entityType: string,
  entityId: string | number
): { [emoji: string]: number[] } {
  const store = getStore()
  const key = `${entityType}:${entityId}`
  return store[key] || {}
}

export function toggleEntityReaction(
  entityType: string,
  entityId: string | number,
  userId: number,
  emoji: ReactionEmoji
): { [emoji: string]: number[] } {
  const store = getStore()
  const key = `${entityType}:${entityId}`

  if (!store[key]) {
    store[key] = {}
  }

  const currentList = store[key][emoji] || []
  const existingIdx = currentList.indexOf(userId)

  if (existingIdx > -1) {
    // Remove reaction
    currentList.splice(existingIdx, 1)
    if (currentList.length === 0) {
      delete store[key][emoji]
    } else {
      store[key][emoji] = currentList
    }
  } else {
    // Add reaction
    store[key][emoji] = [...currentList, userId]
  }

  saveStore(store, true)

  // 1. Broadcast to other open tabs on this machine
  if (bc) {
    bc.postMessage({
      type: "reaction_update",
      key,
      reactions: store[key] || {},
    })
  }

  // 2. Broadcast live to all connected users via Supabase Realtime
  if (realtimeChannel) {
    try {
      realtimeChannel.send({
        type: "broadcast",
        event: "reaction_changed",
        payload: {
          key,
          reactions: store[key] || {},
          userId,
          emoji,
        },
      })
    } catch {
      // ignore
    }
  }

  // 3. Persist to Supabase action_text_rich_texts
  if (isSupabaseConfigured && supabase) {
    const client = supabase
    try {
      const jsonBody = JSON.stringify(store[key] || {})
      client
        .from("action_text_rich_texts")
        .select("id")
        .eq("record_type", "Reaction")
        .eq("name", key)
        .maybeSingle()
        .then(({ data: existing }) => {
          if (existing?.id) {
            client
              .from("action_text_rich_texts")
              .update({ body: jsonBody, updated_at: new Date().toISOString() })
              .eq("id", existing.id)
          } else {
            client.from("action_text_rich_texts").insert({
              record_type: "Reaction",
              name: key,
              record_id: 0,
              body: jsonBody,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
          }
        })
    } catch {
      // ignore
    }
  }

  return store[key] || {}
}
