import React, { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Lesson, LessonType, LessonStatus } from "../../types/database"
import { saveLesson, deleteLesson } from "../../lib/supabase"
import { ArrowLeft, Save, Trash2, Loader2, Sparkles, BookOpen } from "lucide-react"

interface LessonFormProps {
  initialLesson?: Partial<Lesson>
  isEditing?: boolean
}

export default function LessonForm({
  initialLesson = {},
  isEditing = false,
}: LessonFormProps) {
  const navigate = useNavigate()

  const [title, setTitle] = useState(initialLesson.title || "")
  const [slug, setSlug] = useState(initialLesson.slug || "")
  const [lessonDate, setLessonDate] = useState(
    initialLesson.lesson_date || new Date().toISOString().split("T")[0]
  )
  const [lessonType, setLessonType] = useState<LessonType>(
    initialLesson.lesson_type ?? 0
  )
  const [topic, setTopic] = useState(initialLesson.topic || "")
  const [status, setStatus] = useState<LessonStatus>(
    initialLesson.status ?? 0
  )
  const [introduction, setIntroduction] = useState(initialLesson.introduction || "")
  const [content, setContent] = useState(initialLesson.content || "")
  const [position, setPosition] = useState(initialLesson.position ?? 0)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-generate slug from title
  const handleTitleChange = (val: string) => {
    setTitle(val)
    if (!isEditing && !slug) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "")
      )
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const payload: Partial<Lesson> = {
      ...(initialLesson.id ? { id: initialLesson.id } : {}),
      title: title.trim(),
      slug: slug.trim(),
      lesson_date: lessonDate,
      lesson_type: lessonType,
      topic: topic.trim() || null,
      status,
      introduction: introduction.trim() || null,
      position: Number(position) || 0,
    }

    try {
      await saveLesson(payload, content.trim())
      navigate("/admin")
    } catch (err: any) {
      setError(err?.message || "Failed to save lesson.")
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!initialLesson.id) return
    if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) return

    setIsLoading(true)
    try {
      await deleteLesson(initialLesson.id)
      navigate("/admin")
    } catch (err: any) {
      setError(err?.message || "Failed to delete lesson.")
      setIsLoading(false)
    }
  }

  const isTopic = lessonType === 1

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6 max-w-3xl mx-auto"
    >
      {/* Form Header */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            {isTopic ? (
              <Sparkles className="w-5 h-5 text-emerald-600" />
            ) : (
              <BookOpen className="w-5 h-5 text-blue-600" />
            )}
            <span>{isEditing ? `Edit ${isTopic ? "Topic" : "Daily Class"}` : `New ${isTopic ? "Topic" : "Daily Class"}`}</span>
          </h1>
          <p className="text-xs text-stone-500">
            {isEditing ? `Update details for "${initialLesson.title}".` : "Fill in lesson details and rich content."}
          </p>
        </div>

        <Link
          to="/admin"
          className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1 font-semibold transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Link>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Grid Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Title */}
        <div className="sm:col-span-2 space-y-1">
          <label className="text-xs font-bold text-stone-700">Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="e.g. Everyday Hinglish to Fluent English"
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
          />
        </div>

        {/* Slug */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-stone-700">Slug (URL path)</label>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. everyday-hinglish-to-fluent-english"
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 font-mono text-[11px] focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
          />
        </div>

        {/* Date */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-stone-700">Lesson Date</label>
          <input
            type="date"
            required
            value={lessonDate}
            onChange={(e) => setLessonDate(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
          />
        </div>

        {/* Lesson Type */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-stone-700">Classification</label>
          <select
            value={lessonType}
            onChange={(e) => setLessonType(Number(e.target.value) as LessonType)}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition bg-white"
          >
            <option value={0}>Daily Class (Calendar Based)</option>
            <option value={1}>Foundational Topic (Curriculum)</option>
          </select>
        </div>

        {/* Status */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-stone-700">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(Number(e.target.value) as LessonStatus)}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition bg-white"
          >
            <option value={0}>Draft (Hidden from students)</option>
            <option value={1}>Published (Live for everyone)</option>
          </select>
        </div>

        {/* Category / Topic */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-stone-700">Topic / Category Tag</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Daily Speaking, Grammar, Business"
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
          />
        </div>

        {/* Position */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-stone-700">Order Position</label>
          <input
            type="number"
            value={position}
            onChange={(e) => setPosition(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
          />
        </div>

        {/* Introduction */}
        <div className="sm:col-span-2 space-y-1">
          <label className="text-xs font-bold text-stone-700">Summary / Introduction</label>
          <textarea
            rows={2}
            value={introduction}
            onChange={(e) => setIntroduction(e.target.value)}
            placeholder="Brief overview explaining what learners will achieve..."
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
          />
        </div>

        {/* Rich Content (ActionText Body) */}
        <div className="sm:col-span-2 space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-stone-700">Lesson Body (HTML / Markdown Supported)</label>
            <span className="text-[10px] text-stone-400 font-mono">Stored in action_text_rich_texts</span>
          </div>
          <textarea
            rows={12}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="<h2>Section Title</h2><p>Lesson explanation, bullet points, vocabulary fixes...</p>"
            className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-stone-100">
        {isEditing && initialLesson.id ? (
          <button
            type="button"
            disabled={isLoading}
            onClick={handleDelete}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
            <span>Delete Lesson</span>
          </button>
        ) : (
          <div></div>
        )}

        <div className="flex items-center gap-2.5">
          <Link
            to="/admin"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isEditing ? "Save Changes" : "Create Lesson"}</span>
          </button>
        </div>
      </div>
    </form>
  )
}

