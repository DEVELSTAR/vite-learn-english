import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { Note } from "../types/database"
import { fetchUserNotes, saveUserNote, updateUserNote, deleteUserNote } from "../lib/supabase"
import { FileText, Plus, Trash2, Pencil, Check, X, Loader2, LogIn } from "lucide-react"

export default function NotesPage() {
  const { currentUser } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [newContent, setNewContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Edit Note State
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    async function load() {
      if (currentUser?.id) {
        setIsLoading(true)
        try {
          const data = await fetchUserNotes(currentUser.id)
          setNotes(data)
        } finally {
          setIsLoading(false)
        }
      } else {
        setIsLoading(false)
      }
    }
    load()
  }, [currentUser?.id])

  const handleAddGlobalNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newContent.trim() || isSaving || !currentUser) return

    setIsSaving(true)
    try {
      const saved = await saveUserNote(currentUser.id, newContent.trim(), null)
      setNotes((prev) => [saved, ...prev])
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
    if (!confirm("Are you sure you want to delete this study note?")) return

    try {
      await deleteUserNote(noteId, currentUser.id)
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
      if (editingNoteId === noteId) cancelEdit()
    } catch (err: any) {
      alert(err?.message || "Failed to delete note.")
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-amber-600" />
            <span>My Personal Study Notes</span>
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Private repository of vocabulary, idioms, grammar rules, and speech corrections.
          </p>
        </div>
      </div>

      {!currentUser ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 space-y-3">
          <FileText className="w-10 h-10 text-stone-300 mx-auto" />
          <h2 className="text-base font-bold text-stone-800">Sign In to Access Your Notes</h2>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Your notes sync across all your devices so you can review vocabulary on the go.
          </p>
          <Link
            to="/auth/sign-in"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In to Student Portal</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Note Add */}
          <form onSubmit={handleAddGlobalNote} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
            <h2 className="text-xs font-bold text-stone-700">Quick Note Capture</h2>
            <textarea
              rows={3}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Jot down a new word, pronunciation tip, or thought..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!newContent.trim() || isSaving}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Add Note</span>
              </button>
            </div>
          </form>

          {/* Notes Grid */}
          {isLoading ? (
            <div className="text-center py-12 text-stone-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
              <span className="text-xs">Loading notes...</span>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-12 text-stone-400 bg-white rounded-2xl border border-stone-200 p-8">
              No notes saved yet. Capture words above or during any daily class!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {notes.map((note) => {
                const isEditing = editingNoteId === note.id

                return (
                  <div
                    key={note.id}
                    className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col justify-between space-y-3"
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <textarea
                          rows={4}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full p-3 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 transition resize-none"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="px-3 py-1.5 rounded-lg text-xs text-stone-500 hover:bg-stone-100 transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={!editContent.trim() || isUpdating}
                            onClick={() => handleSaveEdit(note.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                          >
                            {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            <span>Save Changes</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-stone-800 leading-relaxed whitespace-pre-wrap">{note.content}</p>

                        <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-stone-500">
                              {note.is_global ? "Global Note" : "Class Note"}
                            </span>
                            <span>&bull;</span>
                            <span className="font-mono">
                              {new Date(note.updated_at || note.created_at).toLocaleDateString()}
                            </span>
                            {note.updated_at && note.updated_at !== note.created_at && (
                              <span className="text-[10px] text-amber-600 italic">(edited)</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(note)}
                              className="text-stone-400 hover:text-amber-700 transition cursor-pointer p-1"
                              title="Edit Note"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(note.id)}
                              className="text-stone-400 hover:text-red-600 transition cursor-pointer p-1"
                              title="Delete Note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
