import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import {
  FileText,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  Globe,
  Users,
  ExternalLink,
} from "lucide-react"
import { Lesson, Note, User } from "../../types/database"
import { useAuth } from "../../context/AuthContext"
import {
  fetchVisibleNotes,
  createNoteWithSharing,
  updateNoteWithSharing,
  deleteNote,
  canEditNote,
  canDeleteNote,
  fetchAvailableStudents,
} from "../../lib/supabase"
import ReactionBar from "../common/ReactionBar"
import { formatTimeAgo } from "../../lib/dateUtils"

interface LessonNotesProps {
  lesson: Lesson
  onNotesCountChange?: (count: number) => void
}

export default function LessonNotes({ lesson, onNotesCountChange }: LessonNotesProps) {
  const { currentUser, isSuperAdmin } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [newContent, setNewContent] = useState("")
  const [sharingMode, setSharingMode] = useState<"global" | "shared">("global")
  const [availableStudents, setAvailableStudents] = useState<User[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([])
  const [inviteCanEdit, setInviteCanEdit] = useState(false)
  const [showShareOptions, setShowShareOptions] = useState(false)

  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Edit State
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  // Load available students
  useEffect(() => {
    async function loadStudents() {
      if (currentUser?.id) {
        try {
          const students = await fetchAvailableStudents(currentUser.id)
          setAvailableStudents(students)
        } catch {
          // ignore
        }
      }
    }
    loadStudents()
  }, [currentUser?.id])

  // Load lesson notes
  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const data = await fetchVisibleNotes(currentUser?.id, {
          lessonId: lesson.id,
          isSuperAdmin,
        })
        setNotes(data)
        onNotesCountChange?.(data.length)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [lesson.id, currentUser?.id, isSuperAdmin])

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newContent.trim() || isSaving) return

    if (!currentUser) {
      alert("Please sign in to save notes.")
      return
    }

    if (sharingMode === "shared" && selectedStudentIds.length === 0) {
      alert("Please select at least one student or switch to Public.")
      return
    }

    setIsSaving(true)
    try {
      const saved = await createNoteWithSharing(currentUser.id, {
        content: newContent.trim(),
        lessonId: lesson.id,
        isGlobal: sharingMode === "global",
        inviteUserIds: sharingMode === "shared" ? selectedStudentIds : [],
        inviteCanEdit,
      })

      const updated = [saved, ...notes]
      setNotes(updated)
      onNotesCountChange?.(updated.length)
      setNewContent("")
      setShowShareOptions(false)
      setSelectedStudentIds([])
      setInviteCanEdit(false)
      setSharingMode("global")
    } catch (err: any) {
      alert(err?.message || "Failed to save note.")
    } finally {
      setIsSaving(false)
    }
  }

  const startEdit = (note: Note) => {
    setEditingNoteId(note.id)
    setEditContent(note.content)
  }

  const cancelEdit = () => {
    setEditingNoteId(null)
    setEditContent("")
  }

  const handleSaveEdit = async (noteId: number) => {
    if (!currentUser || !editContent.trim() || isUpdating) return

    setIsUpdating(true)
    try {
      const updated = await updateNoteWithSharing(
        noteId,
        currentUser.id,
        { content: editContent.trim() },
        isSuperAdmin
      )
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, content: updated.content, updated_at: updated.updated_at } : n))
      )
      setEditingNoteId(null)
      setEditContent("")
    } catch (err: any) {
      alert(err?.message || "Failed to update note.")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (noteId: number) => {
    if (!currentUser) return
    if (!confirm("Are you sure you want to delete this note?")) return

    try {
      await deleteNote(noteId, currentUser.id, isSuperAdmin)
      const updated = notes.filter((n) => n.id !== noteId)
      setNotes(updated)
      onNotesCountChange?.(updated.length)
      if (editingNoteId === noteId) cancelEdit()
    } catch (err: any) {
      alert(err?.message || "Failed to delete note.")
    }
  }

  const toggleStudent = (id: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  return (
    <div className="flex flex-col h-[480px] lg:h-[520px]">
      {/* Header bar */}
      <div className="p-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-800" />
          <span className="text-xs font-bold text-stone-900">
            {lesson.lesson_type === 1 ? "Topic Notes" : "Class Notes"}
          </span>
          <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
            {notes.length}
          </span>
        </div>

        <Link
          to={`/notes?lesson_id=${lesson.id}`}
          className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 transition"
          title="Open in full notes page"
        >
          <span>View all</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
        {isLoading ? (
          <div className="text-center py-10 text-stone-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
            <span>Loading notes...</span>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-10 space-y-2 text-stone-500">
            <FileText className="w-7 h-7 text-stone-300 mx-auto" />
            <p className="font-semibold text-stone-700">No notes yet</p>
            <p className="text-[11px] text-stone-400 max-w-xs mx-auto">
              Write down tricky words, idioms, or sentences from this {lesson.lesson_type === 1 ? "topic" : "class"}!
            </p>
          </div>
        ) : (
          notes.map((note) => {
            const isEditing = editingNoteId === note.id
            const canEdit = canEditNote(note, currentUser)
            const canDelete = canDeleteNote(note, currentUser)
            const userShare = currentUser
              ? (note.note_shares || []).find(
                  (s) => s.user_id === currentUser.id && s.status === 1
                )
              : null

            return (
              <div
                key={note.id}
                className="bg-white border border-stone-200 rounded-xl p-3 shadow-2xs space-y-2 hover:border-stone-300 transition"
              >
                {/* Note Subheader */}
                <div className="flex items-center justify-between text-[10px] text-stone-400 gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-stone-700">
                      {note.user?.name || "Community"}
                    </span>
                    {note.user?.role !== undefined && note.user.role >= 1 && (
                      <span className="text-[9px] bg-stone-100 text-stone-600 px-1 py-0.2 rounded font-semibold border border-stone-200">
                        Teacher
                      </span>
                    )}
                    {note.is_global ? (
                      <span className="text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.2 rounded font-medium">
                        Public
                      </span>
                    ) : (
                      <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-medium">
                        Shared ({note.note_shares?.length || 0})
                      </span>
                    )}
                    {currentUser && note.user_id !== currentUser.id && userShare && (
                      <span className="text-[9px] text-blue-600">
                        • {userShare.can_edit ? "Can edit" : "View only"}
                      </span>
                    )}
                  </div>

                  <span className="font-mono shrink-0">
                    {formatTimeAgo(note.updated_at || note.created_at)}
                  </span>
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 bg-white resize-none"
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-2.5 py-1 rounded text-[11px] text-stone-500 hover:bg-stone-100 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!editContent.trim() || isUpdating}
                        onClick={() => handleSaveEdit(note.id)}
                        className="px-3 py-1 rounded bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-xs"
                      >
                        {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-stone-800 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                    <div className="flex flex-wrap items-center justify-between gap-1 pt-1.5 border-t border-stone-100 text-[10px] text-stone-400">
                      <div>
                        {note.updated_at && note.updated_at !== note.created_at && (
                          <span className="text-[9px] text-amber-600 italic">(edited)</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <ReactionBar
                          entityType="note"
                          entityId={note.id}
                          ownerId={note.user_id}
                          contentPreview={note.content}
                          align="right"
                        />

                        {(canEdit || canDelete) && (
                          <div className="flex items-center gap-1 pl-1 border-l border-stone-200">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => startEdit(note)}
                                className="text-stone-400 hover:text-stone-900 transition cursor-pointer p-0.5"
                                title="Edit note"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDelete(note.id)}
                                className="text-stone-400 hover:text-red-600 transition cursor-pointer p-0.5"
                                title="Delete note"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Add Note Form */}
      {currentUser ? (
        <form onSubmit={handleAddNote} className="p-2.5 border-t border-stone-200 bg-white space-y-2">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={2}
            placeholder={`Write a note for this ${lesson.lesson_type === 1 ? "topic" : "class"}...`}
            className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition resize-none"
          />

          {showShareOptions && (
            <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 space-y-2 text-xs">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="lesson_sharing_mode"
                    value="global"
                    checked={sharingMode === "global"}
                    onChange={() => setSharingMode("global")}
                  />
                  <span>Public</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="lesson_sharing_mode"
                    value="shared"
                    checked={sharingMode === "shared"}
                    onChange={() => setSharingMode("shared")}
                  />
                  <span>Share</span>
                </label>
              </div>

              {sharingMode === "shared" && (
                <div className="space-y-1.5">
                  <div className="max-h-24 overflow-y-auto border border-stone-200 bg-white rounded p-1.5 space-y-1">
                    {availableStudents.map((s) => (
                      <label key={s.id} className="flex items-center gap-1.5 hover:bg-stone-50 p-1 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(s.id)}
                          onChange={() => toggleStudent(s.id)}
                        />
                        <span className="text-[11px] text-stone-800">{s.name}</span>
                      </label>
                    ))}
                  </div>
                  <label className="flex items-center gap-1 cursor-pointer text-[11px] text-stone-600">
                    <input
                      type="checkbox"
                      checked={inviteCanEdit}
                      onChange={(e) => setInviteCanEdit(e.target.checked)}
                    />
                    <span>Allow invited students to edit</span>
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowShareOptions(!showShareOptions)}
              className="text-[11px] text-stone-500 hover:text-stone-800 flex items-center gap-1 cursor-pointer"
            >
              {sharingMode === "global" ? (
                <>
                  <Globe className="w-3 h-3 text-stone-400" />
                  <span>Public</span>
                </>
              ) : (
                <>
                  <Users className="w-3 h-3 text-blue-500" />
                  <span>Shared ({selectedStudentIds.length})</span>
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={!newContent.trim() || isSaving}
              className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Save Note</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="p-3 border-t border-stone-200 bg-stone-50 text-center text-xs text-stone-500">
          <Link to="/auth/sign-in" className="text-emerald-800 font-semibold hover:underline">
            Sign in
          </Link>{" "}
          to write and share notes for this lesson.
        </div>
      )}
    </div>
  )
}
