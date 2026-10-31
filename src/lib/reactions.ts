// Reaction storage and helper service
export type ReactionEmoji = "👍" | "❤️" | "💡" | "👏" | "🔥" | "🎯"

export const AVAILABLE_REACTIONS: ReactionEmoji[] = ["👍", "❤️", "💡", "👏", "🔥", "🎯"]

const STORAGE_KEY = "learn_english_reactions_store"

export interface StoredReactions {
  // key format: `${entityType}:${entityId}` -> { [emoji]: userId[] }
  [key: string]: {
    [emoji: string]: number[]
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

function saveStore(store: StoredReactions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    window.dispatchEvent(new CustomEvent("learn_english_reactions_updated"))
  } catch (e) {
    console.warn("Failed to persist reactions store:", e)
  }
}

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

  saveStore(store)
  return store[key] || {}
}

