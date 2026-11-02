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
const READ_IDS_KEY = "learn_english_read_notif_ids"

// Persistent set of IDs of notifications marked as read
function getReadNotificationIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_IDS_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw))
  } catch {
    return new Set()
  }
}

function saveReadNotificationId(id: string) {
  try {
    const set = getReadNotificationIds()
    set.add(id)
    localStorage.setItem(READ_IDS_KEY, JSON.stringify(Array.from(set).slice(-500)))
  } catch {
    // ignore
  }
}

function saveReadNotificationIds(ids: string[]) {
  try {
    const set = getReadNotificationIds()
    ids.forEach((id) => set.add(id))
    localStorage.setItem(READ_IDS_KEY, JSON.stringify(Array.from(set).slice(-500)))
  } catch {
    // ignore
  }
}

// 1. Multi-Tab BroadcastChannel
let notifBc: BroadcastChannel | null = null
try {
  if (typeof BroadcastChannel !== "undefined") {
    notifBc = new BroadcastChannel("learn_english_notifications_channel")
    notifBc.onmessage = (event) => {
      const data = event.data
      if (data?.type === "notification_received" && data.notification) {
        addLocalNotificationItem(data.notification, false)
      } else if (data?.type === "notification_read" && data.id) {
        markNotificationAsRead(data.id, data.userId, false)
      } else if (data?.type === "all_notifications_read" && data.userId) {
        markAllNotificationsAsRead(data.userId, false)
      } else if (data?.type === "clear_notifications" && data.userId) {
        clearUserNotifications(data.userId, false)
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
  const readIds = getReadNotificationIds()

  // If this item was previously marked as read, preserve read: true
  if (readIds.has(item.id)) {
    item.read = true
  }

  // Avoid duplicate notifications by id
  const existingIdx = current.findIndex((n) => n.id === item.id)
  if (existingIdx > -1) {
    // If it exists, keep the read state
    const existing = current[existingIdx]
    current[existingIdx] = {
      ...item,
      read: existing.read || item.read || readIds.has(item.id),
    }
    saveLocalNotifications(current, broadcast)
    return
  }

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
  const readIds = getReadNotificationIds()
  return all
    .filter((n) => n.recipient_id === userId)
    .map((n) => ({
      ...n,
      read: n.read || readIds.has(n.id),
    }))
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
      .select("id, body, created_at")
      .eq("record_type", "Notification")
      .eq("record_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)

    if (!error && data) {
      const current = getLocalNotifications()
      const readIds = getReadNotificationIds()

      // Map of existing items
      const mergedMap = new Map<string, NotificationItem>()
      for (const item of current) {
        mergedMap.set(item.id, {
          ...item,
          read: item.read || readIds.has(item.id),
        })
      }

      for (const row of data) {
        try {
          if (row.body) {
            const parsed = JSON.parse(row.body) as NotificationItem
            if (parsed && parsed.id) {
              const localItem = mergedMap.get(parsed.id)
              // If marked read locally or in readIds or in DB, ALWAYS KEEP READ: TRUE!
              const isRead = Boolean(parsed.read || localItem?.read || readIds.has(parsed.id))
              mergedMap.set(parsed.id, {
                ...parsed,
                read: isRead,
              })
            }
          }
        } catch {
          // ignore
        }
      }

      const mergedList = Array.from(mergedMap.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 100)

      saveLocalNotifications(mergedList, false)
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

export function markNotificationAsRead(id: string, userId?: number, shouldBroadcast = true) {
  saveReadNotificationId(id)

  const all = getLocalNotifications()
  const updated = all.map((n) => (n.id === id ? { ...n, read: true } : n))
  saveLocalNotifications(updated)

  if (shouldBroadcast && notifBc) {
    try {
      notifBc.postMessage({ type: "notification_read", id, userId })
    } catch {
      // ignore
    }
  }

  // Persist read status update to Supabase in background
  if (isSupabaseConfigured && supabase && userId) {
    const client = supabase
    try {
      client
        .from("action_text_rich_texts")
        .select("id, body")
        .eq("record_type", "Notification")
        .eq("record_id", userId)
        .then(({ data }) => {
          if (data) {
            for (const row of data) {
              if (row.body && row.body.includes(id)) {
                try {
                  const parsed = JSON.parse(row.body)
                  if (parsed.id === id && !parsed.read) {
                    parsed.read = true
                    client
                      .from("action_text_rich_texts")
                      .update({ body: JSON.stringify(parsed), updated_at: new Date().toISOString() })
                      .eq("id", row.id)
                      .then(() => {})
                  }
                } catch {
                  // ignore
                }
              }
            }
          }
        })
    } catch {
      // ignore
    }
  }
}

export function markAllNotificationsAsRead(userId: number, shouldBroadcast = true) {
  const all = getLocalNotifications()
  const readIds: string[] = []

  const updated = all.map((n) => {
    if (n.recipient_id === userId) {
      readIds.push(n.id)
      return { ...n, read: true }
    }
    return n
  })

  saveReadNotificationIds(readIds)
  saveLocalNotifications(updated)

  if (shouldBroadcast && notifBc) {
    try {
      notifBc.postMessage({ type: "all_notifications_read", userId })
    } catch {
      // ignore
    }
  }

  // Persist mark all read update to Supabase in background
  if (isSupabaseConfigured && supabase && userId) {
    const client = supabase
    try {
      client
        .from("action_text_rich_texts")
        .select("id, body")
        .eq("record_type", "Notification")
        .eq("record_id", userId)
        .then(({ data }) => {
          if (data) {
            for (const row of data) {
              if (row.body) {
                try {
                  const parsed = JSON.parse(row.body)
                  if (!parsed.read) {
                    parsed.read = true
                    client
                      .from("action_text_rich_texts")
                      .update({ body: JSON.stringify(parsed), updated_at: new Date().toISOString() })
                      .eq("id", row.id)
                      .then(() => {})
                  }
                } catch {
                  // ignore
                }
              }
            }
          }
        })
    } catch {
      // ignore
    }
  }
}

export function clearUserNotifications(userId: number, shouldBroadcast = true) {
  const all = getLocalNotifications()
  const filtered = all.filter((n) => n.recipient_id !== userId)
  saveLocalNotifications(filtered)

  if (shouldBroadcast && notifBc) {
    try {
      notifBc.postMessage({ type: "clear_notifications", userId })
    } catch {
      // ignore
    }
  }

  // Delete from Supabase in background
  if (isSupabaseConfigured && supabase && userId) {
    try {
      supabase
        .from("action_text_rich_texts")
        .delete()
        .eq("record_type", "Notification")
        .eq("record_id", userId)
        .then(() => {})
    } catch {
      // ignore
    }
  }
}
