import React, { useState, useEffect } from "react"
import { FileText, Plus, Trash2, Pencil, Check, X, Loader2 } from "lucide-react"
import { Lesson, Note } from "../../types/database"
import { useAuth } from "../../context/AuthContext"
import { fetchUserNotes, saveUserNote, updateUserNote, deleteUserNote } from "../../lib/supabase"

interface LessonNotesProps {
  lesson: Lesson
  onNotesCountChange?: (count: number) => void
}

export default function LessonNotes({ lesson, onNotesCountChange }: LessonNotesProps) {
  const { currentUser } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [newContent, setNewContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Edit State
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    async function load() {
      if (currentUser?.id) {
        setIsLoading(true)
        try {
          const data = await fetchUserNotes(currentUser.id, lesson.id)
          setNotes(data)
          onNotesCountChange?.(data.length)
        } finally {
          setIsLoading(false)
        }
      } else {
        setIsLoading(false)
      }
    }
    load()
  }, [lesson.id, currentUser?.id])

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newContent.trim() || isSaving) return

    if (!currentUser) {
      alert("Please sign in to save your personal notes.")
      return
    }

    setIsSaving(true)
    try {
      const saved = await saveUserNote(currentUser.id, newContent.trim(), lesson.id)
      const updated = [saved, ...notes]
      setNotes(updated)
      onNotesCountChange?.(updated.length)
      setNewContent("")
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
      const updated = await updateUserNote(noteId, currentUser.id, editContent.trim())
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId ? { ...n, content: updated.content, updated_at: updated.updated_at } : n
        )
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
      await deleteUserNote(noteId, currentUser.id)
      const updated = notes.filter((n) => n.id !== noteId)
      setNotes(updated)
      onNotesCountChange?.(updated.length)
      if (editingNoteId === noteId) cancelEdit()
    } catch (err: any) {
      alert(err?.message || "Failed to delete note.")
    }
  }

  return (
    <div className="flex flex-col h-[480px] lg:h-[520px]">
      {/* Header bar */}
      <div className="p-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-bold text-stone-900">Personal Lesson Notes</span>
          <span className="text-[10px] font-mono bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
            {notes.length}
          </span>
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
        {!currentUser ? (
          <div className="text-center py-12 space-y-2 text-stone-500">
            <FileText className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="font-semibold text-stone-700">Private Study Notes</p>
            <p className="text-[11px] text-stone-400 max-w-xs mx-auto">
              Sign in to keep private vocabulary, pronunciation tips, and practice notes for this class.
            </p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-10 text-stone-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading notes...</span>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-10 space-y-2 text-stone-500">
            <FileText className="w-7 h-7 text-stone-300 mx-auto" />
            <p className="font-semibold text-stone-700">No notes yet</p>
            <p className="text-[11px] text-stone-400 max-w-xs mx-auto">
              Write down tricky words, idioms, or sentences you want to practice later!
            </p>
          </div>
        ) : (
          notes.map((note) => {
            const isEditing = editingNoteId === note.id

            return (
              <div
                key={note.id}
                className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3 shadow-2xs space-y-2"
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 bg-white resize-none"
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-2.5 py-1 rounded text-[11px] text-stone-500 hover:bg-stone-200/60 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!editContent.trim() || isUpdating}
                        onClick={() => handleSaveEdit(note.id)}
                        className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer"
                      >
                        {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-stone-800 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-amber-200/50 text-[10px] text-stone-400">
                      <div className="flex items-center gap-1">
                        <span className="font-mono">{new Date(note.updated_at || note.created_at).toLocaleDateString()}</span>
                        {note.updated_at && note.updated_at !== note.created_at && (
                          <span className="text-[9px] text-amber-600 italic">(edited)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(note)}
                          className="text-stone-400 hover:text-amber-700 transition cursor-pointer p-0.5"
                          title="Edit note"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(note.id)}
                          className="text-stone-400 hover:text-red-600 transition cursor-pointer p-0.5"
                          title="Delete note"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
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
      {currentUser && (
        <form onSubmit={handleAddNote} className="p-2.5 border-t border-stone-200 bg-white space-y-2">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={2}
            placeholder="Type a new private study note..."
            className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition resize-none"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!newContent.trim() || isSaving}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Save Note</span>
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
