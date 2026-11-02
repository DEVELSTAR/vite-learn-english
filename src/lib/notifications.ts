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

// 1. Multi-Tab BroadcastChannel
let notifBc: BroadcastChannel | null = null
try {
  if (typeof BroadcastChannel !== "undefined") {
    notifBc = new BroadcastChannel("learn_english_notifications_channel")
    notifBc.onmessage = (event) => {
      if (event.data?.type === "notification_received" && event.data.notification) {
        addLocalNotificationItem(event.data.notification, false)
      }
    }
  }
} catch {
  // ignore
}

// 2. Supabase Realtime Channel for live cross-user notifications
let realtimeNotifChannel: any = null
if (isSupabaseConfigured && supabase) {
  try {
    realtimeNotifChannel = supabase.channel("live_notifications_channel")
    realtimeNotifChannel
      .on("broadcast", { event: "live_notification" }, (envelope: any) => {
        const item = envelope.payload as NotificationItem
        if (item && item.id) {
          addLocalNotificationItem(item, false)
        }
      })
      .subscribe()
  } catch (err) {
    console.warn("Could not subscribe to live notifications channel:", err)
  }
}

function getLocalNotifications(): NotificationItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as NotificationItem[]
  } catch {
    return []
  }
}

function saveLocalNotifications(items: NotificationItem[], shouldBroadcast = true) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items))
    window.dispatchEvent(new CustomEvent("learn_english_notifications_updated"))
  } catch (e) {
    console.warn("Failed to persist notifications:", e)
  }
}

function addLocalNotificationItem(item: NotificationItem, broadcast = true) {
  const current = getLocalNotifications()
  // Avoid duplicate notifications by id
  if (current.some((n) => n.id === item.id)) return

  const updated = [item, ...current.slice(0, 99)]
  saveLocalNotifications(updated, broadcast)

  if (broadcast && notifBc) {
    try {
      notifBc.postMessage({
        type: "notification_received",
        notification: item,
      })
    } catch {
      // ignore
    }
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

export async function syncNotificationsFromDatabase(userId: number): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !userId) return
  try {
    const { data, error } = await supabase
      .from("action_text_rich_texts")
      .select("body, created_at")
      .eq("record_type", "Notification")
      .eq("record_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)

    if (!error && data) {
      const current = getLocalNotifications()
      const existingIds = new Set(current.map((n) => n.id))
      const fetchedItems: NotificationItem[] = []

      for (const row of data) {
        try {
          if (row.body) {
            const parsed = JSON.parse(row.body) as NotificationItem
            if (parsed && parsed.id && !existingIds.has(parsed.id)) {
              fetchedItems.push(parsed)
              existingIds.add(parsed.id)
            }
          }
        } catch {
          // ignore
        }
      }

      if (fetchedItems.length > 0) {
        saveLocalNotifications([...fetchedItems, ...current].slice(0, 100), false)
      }
    }
  } catch (e) {
    console.warn("Error syncing notifications from Supabase:", e)
  }
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

  if (!ownerId) return

  let typeLabel = "study note"
  if (entityType === "comment") typeLabel = "discussion comment"
  if (entityType === "ai_chat") typeLabel = "message"

  const isSelf = ownerId === actorId
  const message = isSelf
    ? `You reacted ${emoji} to your ${typeLabel}.`
    : `${actorName} reacted ${emoji} to your ${typeLabel}.`

  const newNotification: NotificationItem = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    recipient_id: ownerId,
    actor_id: actorId,
    actor_name: actorName,
    entity_type: entityType,
    entity_id: entityId,
    emoji,
    message,
    content_preview: contentPreview ? contentPreview.slice(0, 80) : undefined,
    created_at: new Date().toISOString(),
    read: false,
  }

  // 1. Save locally and broadcast to other open tabs
  addLocalNotificationItem(newNotification, true)

  // 2. Broadcast via Supabase Realtime channel to other online browsers/users
  if (realtimeNotifChannel) {
    try {
      realtimeNotifChannel.send({
        type: "broadcast",
        event: "live_notification",
        payload: newNotification,
      })
    } catch (e) {
      console.warn("Realtime notification broadcast error:", e)
    }
  }

  // 3. Persist to Supabase action_text_rich_texts
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
