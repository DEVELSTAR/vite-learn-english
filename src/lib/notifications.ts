import { supabase, isSupabaseConfigured } from "./supabase"

export interface NotificationItem {
  id: string
  recipient_id: number
  actor_id: number
  actor_name: string
  entity_type: "note" | "comment" | "ai_chat"
  entity_id: string | number
  emoji: string
  message: string
  content_preview?: string
  created_at: string
  read: boolean
}

const LOCAL_STORAGE_KEY = "learn_english_notifications"

function getLocalNotifications(): NotificationItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as NotificationItem[]
  } catch {
    return []
  }
}

function saveLocalNotifications(items: NotificationItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items))
    window.dispatchEvent(new CustomEvent("learn_english_notifications_updated"))
  } catch (e) {
    console.warn("Failed to persist notifications:", e)
  }
}

export function getUserNotifications(userId: number): NotificationItem[] {
  const all = getLocalNotifications()
  return all
    .filter((n) => n.recipient_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function getUnreadCount(userId: number): number {
  return getUserNotifications(userId).filter((n) => !n.read).length
}

export async function addReactionNotification(params: {
  ownerId: number
  actorId: number
  actorName: string
  entityType: "note" | "comment" | "ai_chat"
  entityId: string | number
  emoji: string
  contentPreview?: string
}): Promise<void> {
  const { ownerId, actorId, actorName, entityType, entityId, emoji, contentPreview } = params

  // Do not notify if user reacted to their own content
  if (ownerId === actorId) return

  let typeLabel = "study note"
  if (entityType === "comment") typeLabel = "discussion comment"
  if (entityType === "ai_chat") typeLabel = "message"

  const newNotification: NotificationItem = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    recipient_id: ownerId,
    actor_id: actorId,
    actor_name: actorName,
    entity_type: entityType,
    entity_id: entityId,
    emoji,
    message: `${actorName} reacted ${emoji} to your ${typeLabel}.`,
    content_preview: contentPreview ? contentPreview.slice(0, 80) : undefined,
    created_at: new Date().toISOString(),
    read: false,
  }

  // 1. Save locally
  const current = getLocalNotifications()
  saveLocalNotifications([newNotification, ...current.slice(0, 99)])

  // 2. Persist to Supabase action_text_rich_texts if available
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("action_text_rich_texts").insert({
        record_type: "Notification",
        record_id: ownerId,
        name: "reaction",
        body: JSON.stringify(newNotification),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    } catch (e) {
      console.warn("Could not sync notification to Supabase:", e)
    }
  }
}

export function markNotificationAsRead(id: string) {
  const all = getLocalNotifications()
  const updated = all.map((n) => (n.id === id ? { ...n, read: true } : n))
  saveLocalNotifications(updated)
}

export function markAllNotificationsAsRead(userId: number) {
  const all = getLocalNotifications()
  const updated = all.map((n) => (n.recipient_id === userId ? { ...n, read: true } : n))
  saveLocalNotifications(updated)
}

export function clearUserNotifications(userId: number) {
  const all = getLocalNotifications()
  const filtered = all.filter((n) => n.recipient_id !== userId)
  saveLocalNotifications(filtered)
}

