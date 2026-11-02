import React, { useState, useEffect, useRef } from "react"
import { Smile } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import {
  AVAILABLE_REACTIONS,
  ReactionEmoji,
  getEntityReactions,
  toggleEntityReaction,
} from "../../lib/reactions"
import { addReactionNotification } from "../../lib/notifications"
import { logActivity } from "../../lib/activityHistory"

interface ReactionBarProps {
  entityType: "ai_chat" | "comment" | "note"
  entityId: string | number
  ownerId?: number
  contentPreview?: string
  className?: string
  align?: "left" | "right"
}

export default function ReactionBar({
  entityType,
  entityId,
  ownerId,
  contentPreview,
  className = "",
  align = "left",
}: ReactionBarProps) {
  const { currentUser } = useAuth()
  const [reactions, setReactions] = useState<{ [emoji: string]: number[] }>({})
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Load reactions
  const reload = () => {
    setReactions(getEntityReactions(entityType, entityId))
  }

  useEffect(() => {
    reload()

    const handleUpdate = () => reload()
    window.addEventListener("learn_english_reactions_updated", handleUpdate)
    return () => {
      window.removeEventListener("learn_english_reactions_updated", handleUpdate)
    }
  }, [entityType, entityId])

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false)
      }
    }
    if (showPicker) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showPicker])

  const handleToggle = (emoji: ReactionEmoji) => {
    if (!currentUser) return
    const currentList = reactions[emoji] || []
    const isAdding = !currentList.includes(currentUser.id)

    const updated = toggleEntityReaction(entityType, entityId, currentUser.id, emoji)
    setReactions({ ...updated })
    setShowPicker(false)

    // If a reaction was added, send notification to owner if present
    if (isAdding && ownerId) {
      addReactionNotification({
        ownerId,
        actorId: currentUser.id,
        actorName: currentUser.name,
        entityType,
        entityId,
        emoji,
        contentPreview,
      })

      logActivity({
        user_id: currentUser.id,
        user_name: currentUser.name,
        user_email: currentUser.email_address,
        user_role: currentUser.role,
        action: "create",
        resource_type: "reaction",
        resource_id: entityId,
        details: `Reacted ${emoji} on ${entityType} #${entityId}`,
      })
    }
  }

  const activeEmojis = Object.keys(reactions).filter(
    (emoji) => (reactions[emoji] || []).length > 0
  )

  return (
    <div
      className={`relative inline-flex items-center gap-1 text-[11px] select-none ${className}`}
    >
      {/* Active Reaction Pills */}
      {activeEmojis.map((emoji) => {
        const userList = reactions[emoji] || []
        const hasReacted = currentUser ? userList.includes(currentUser.id) : false

        return (
          <button
            key={emoji}
            type="button"
            onClick={() => handleToggle(emoji as ReactionEmoji)}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border transition cursor-pointer ${
              hasReacted
                ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold shadow-2xs"
                : "bg-white/80 hover:bg-stone-100 border-stone-200 text-stone-600"
            }`}
            title={`${userList.length} reaction${userList.length > 1 ? "s" : ""}`}
          >
            <span>{emoji}</span>
            <span className="text-[10px] font-mono">{userList.length}</span>
          </button>
        )
      })}

      {/* Add Reaction Picker Trigger */}
      <div className="relative" ref={pickerRef}>
        <button
          type="button"
          onClick={() => setShowPicker((prev) => !prev)}
          className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
          title="Add reaction"
        >
          <Smile className="w-3 h-3" />
        </button>

        {/* Floating Emoji Picker Popover */}
        {showPicker && (
          <div
            className={`absolute bottom-full mb-1 z-50 flex items-center gap-1 p-1 bg-white border border-stone-200 rounded-full shadow-lg animate-in fade-in zoom-in-95 duration-100 ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            {AVAILABLE_REACTIONS.map((emoji) => {
              const userList = reactions[emoji] || []
              const hasReacted = currentUser ? userList.includes(currentUser.id) : false

              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleToggle(emoji)}
                  className={`w-6 h-6 flex items-center justify-center text-xs rounded-full hover:scale-125 transition cursor-pointer ${
                    hasReacted ? "bg-emerald-100" : "hover:bg-stone-100"
                  }`}
                >
                  {emoji}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

