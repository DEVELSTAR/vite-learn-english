import React, { useState, useEffect } from "react"
import { Send, MessageCircle, Reply, User, Loader2, Pencil, Trash2, Check, X } from "lucide-react"
import { Lesson, LessonComment } from "../../types/database"
import { useAuth } from "../../context/AuthContext"
import {
  fetchLessonComments,
  postLessonComment,
  updateLessonComment,
  deleteLessonComment,
} from "../../lib/supabase"
import ReactionBar from "../common/ReactionBar"

interface ChatRoomProps {
  lesson: Lesson
  onCommentCountChange?: (count: number) => void
}

export default function ChatRoom({ lesson, onCommentCountChange }: ChatRoomProps) {
  const { currentUser, isAdmin } = useAuth()
  const [comments, setComments] = useState<LessonComment[]>([])
  const [content, setContent] = useState("")
  const [replyingTo, setReplyingTo] = useState<LessonComment | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Editing state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const data = await fetchLessonComments(lesson.id)
        setComments(data)
        onCommentCountChange?.(data.length)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [lesson.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || isSubmitting) return

    if (!currentUser) {
      alert("Please sign in to participate in the lesson discussion.")
      return
    }

    setIsSubmitting(true)
    try {
      const newComment = await postLessonComment(
        lesson.id,
        currentUser.id,
        content.trim(),
        replyingTo ? replyingTo.id : null
      )

      const updated = [...comments, newComment]
      setComments(updated)
      onCommentCountChange?.(updated.length)
      setContent("")
      setReplyingTo(null)
    } catch (err: any) {
      alert(err?.message || "Failed to post comment.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const startEdit = (comment: LessonComment) => {
    setEditingId(comment.id)
    setEditContent(comment.content)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditContent("")
  }

  const handleSaveEdit = async (commentId: number) => {
    if (!currentUser || !editContent.trim() || isUpdating) return

    setIsUpdating(true)
    try {
      const updated = await updateLessonComment(commentId, currentUser.id, editContent.trim())
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, content: updated.content, updated_at: updated.updated_at }
            : c
        )
      )
      setEditingId(null)
      setEditContent("")
    } catch (err: any) {
      alert(err?.message || "Failed to update comment.")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (commentId: number) => {
    if (!currentUser) return
    if (!confirm("Are you sure you want to delete this message?")) return

    try {
      await deleteLessonComment(commentId, currentUser.id)
      const updated = comments.filter((c) => c.id !== commentId && c.parent_id !== commentId)
      setComments(updated)
      onCommentCountChange?.(updated.length)
      if (editingId === commentId) cancelEdit()
      if (replyingTo?.id === commentId) setReplyingTo(null)
    } catch (err: any) {
      alert(err?.message || "Failed to delete comment.")
    }
  }

  const canManage = (comment: LessonComment) => {
    if (!currentUser) return false
    return currentUser.id === comment.user_id || isAdmin
  }

  // Separate root comments and replies
  const rootComments = comments.filter((c) => !c.parent_id)
  const getReplies = (parentId: number) => comments.filter((c) => c.parent_id === parentId)

  return (
    <div className="flex flex-col h-[480px] lg:h-[520px]">
      {/* Header Bar */}
      <div className="p-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-stone-900">Class Room Discussion</span>
          <span className="text-[10px] font-mono bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
            {comments.length}
          </span>
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
        {isLoading ? (
          <div className="text-center py-10 text-stone-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading discussion...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12 space-y-2 text-stone-500">
            <MessageCircle className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="font-semibold text-stone-700">No questions yet!</p>
            <p className="text-[11px] text-stone-400">Be the first to share your practice sentence or doubt below.</p>
          </div>
        ) : (
          rootComments.map((comment) => {
            const replies = getReplies(comment.id)
            const isAuthorAdmin = comment.user?.role === 1 || comment.user?.role === 2
            const isEditing = editingId === comment.id
            const isOwner = canManage(comment)

            return (
              <div key={comment.id} className="space-y-2">
                <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px] font-bold">
                        {comment.user?.name ? comment.user.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <span className="font-bold text-stone-800">{comment.user?.name || "Student"}</span>
                      {isAuthorAdmin && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                          Teacher
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {new Date(comment.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 pt-1">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={2}
                        className="w-full p-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-2.5 py-1 rounded-lg text-[11px] text-stone-500 hover:bg-stone-100 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={!editContent.trim() || isUpdating}
                          onClick={() => handleSaveEdit(comment.id)}
                          className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer"
                        >
                          {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">{comment.content}</p>

                      <div className="pt-1.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-stone-100">
                        <div className="flex items-center gap-2">
                          <ReactionBar
                            entityType="comment"
                            entityId={comment.id}
                            ownerId={comment.user_id}
                            contentPreview={comment.content}
                            align="left"
                          />

                          {isOwner && (
                            <div className="flex items-center gap-1.5 pl-1.5 border-l border-stone-200">
                              <button
                                type="button"
                                onClick={() => startEdit(comment)}
                                className="text-[11px] text-stone-400 hover:text-emerald-700 font-medium flex items-center gap-1 cursor-pointer transition p-0.5"
                                title="Edit message"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(comment.id)}
                                className="text-[11px] text-stone-400 hover:text-red-600 font-medium flex items-center gap-1 cursor-pointer transition p-0.5"
                                title="Delete message"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setReplyingTo(comment)}
                          className="text-[11px] text-stone-500 hover:text-emerald-700 font-medium flex items-center gap-1 cursor-pointer transition"
                        >
                          <Reply className="w-3 h-3" />
                          <span>Reply</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Nested Replies */}
                {replies.length > 0 && (
                  <div className="pl-6 space-y-2 border-l-2 border-emerald-600/20">
                    {replies.map((reply) => {
                      const isReplyOwner = canManage(reply)
                      const isReplyEditing = editingId === reply.id

                      return (
                        <div key={reply.id} className="bg-stone-50 p-2.5 rounded-lg border border-stone-200/80 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-stone-800">{reply.user?.name || "Student"}</span>
                              {(reply.user?.role === 1 || reply.user?.role === 2) && (
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                                  Teacher
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-stone-400 font-mono">
                              {new Date(reply.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>

                          {isReplyEditing ? (
                            <div className="space-y-1.5 pt-1">
                              <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                rows={2}
                                className="w-full p-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white"
                              />
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="px-2 py-0.5 rounded text-[11px] text-stone-500 hover:bg-stone-200/60 transition cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={!editContent.trim() || isUpdating}
                                  onClick={() => handleSaveEdit(reply.id)}
                                  className="px-2.5 py-0.5 rounded bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer"
                                >
                                  {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                  <span>Save</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">{reply.content}</p>

                              <div className="pt-1.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-stone-200/60">
                                <ReactionBar
                                  entityType="comment"
                                  entityId={reply.id}
                                  ownerId={reply.user_id}
                                  contentPreview={reply.content}
                                  align="left"
                                />

                                {isReplyOwner && (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => startEdit(reply)}
                                      className="text-[10px] text-stone-400 hover:text-emerald-700 font-medium flex items-center gap-1 cursor-pointer transition p-0.5"
                                      title="Edit reply"
                                    >
                                      <Pencil className="w-2.5 h-2.5" />
                                      <span>Edit</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(reply.id)}
                                      className="text-[10px] text-stone-400 hover:text-red-600 font-medium flex items-center gap-1 cursor-pointer transition p-0.5"
                                      title="Delete reply"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Replying banner */}
      {replyingTo && (
        <div className="px-3 py-1.5 bg-emerald-50 border-t border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
          <span>Replying to <strong>{replyingTo.user?.name || "Student"}</strong></span>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="text-[10px] font-bold text-stone-500 hover:text-stone-800 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-2.5 border-t border-stone-200 bg-white flex gap-1.5">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={currentUser ? "Share your thought or question in class..." : "Sign in to participate..."}
          disabled={!currentUser || isSubmitting}
          className="flex-1 px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition disabled:bg-stone-100"
        />
        <button
          type="submit"
          disabled={!content.trim() || !currentUser || isSubmitting}
          className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-40 text-white rounded-xl transition flex items-center justify-center cursor-pointer shadow-xs"
        >
          {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </button>
      </form>
    </div>
  )
}
