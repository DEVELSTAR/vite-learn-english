import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { fetchLessons, deleteLesson } from "../../lib/supabase"
import { Lesson } from "../../types/database"
import { Plus, BookOpen, Sparkles, Users, FileText, Trash2, Edit2, Loader2, Eye } from "lucide-react"

export default function AdminDashboardPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const data = await fetchLessons()
      setLessons(data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleDelete = async (lesson: Lesson) => {
    if (!confirm(`Are you sure you want to permanently delete "${lesson.title}"?`)) return

    setDeletingId(lesson.id)
    try {
      await deleteLesson(lesson.id)
      setLessons((prev) => prev.filter((l) => l.id !== lesson.id))
    } catch (err: any) {
      alert(err?.message || "Failed to delete lesson.")
    } finally {
      setDeletingId(null)
    }
  }

  const classesCount = lessons.filter((l) => l.lesson_type === 0).length
  const topicsCount = lessons.filter((l) => l.lesson_type === 1).length

  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Daily Classes</span>
            <BookOpen className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-stone-900">{classesCount}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Topics</span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-stone-900">{topicsCount}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Lessons</span>
            <FileText className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-stone-900">{lessons.length}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Published</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-stone-900">
            {lessons.filter((l) => l.status === 1).length}
          </div>
        </div>
      </div>

      {/* Action Header & Content Table */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-stone-900">Manage Content</h2>
            <p className="text-xs text-stone-500">Create, edit, or publish lessons and foundational curriculum.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/lessons/new?type=daily_class"
              className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Class</span>
            </Link>
            <Link
              to="/admin/lessons/new?type=foundational_topic"
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Topic</span>
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-[10px] border-y border-stone-200 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Title</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-stone-400">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                    <span>Loading lessons...</span>
                  </td>
                </tr>
              ) : lessons.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-stone-400">
                    No lessons created yet. Click &quot;New Class&quot; or &quot;New Topic&quot; to begin!
                  </td>
                </tr>
              ) : (
                lessons.map((lesson) => {
                  const isTopic = lesson.lesson_type === 1
                  const isPublished = lesson.status === 1

                  return (
                    <tr key={lesson.id} className="hover:bg-stone-50/60 transition">
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isTopic ? "bg-emerald-50 text-emerald-800" : "bg-blue-50 text-blue-800"
                          }`}
                        >
                          {isTopic ? "Topic" : "Class"}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-bold text-stone-900">
                        <Link
                          to={isTopic ? `/topics/${lesson.slug}` : `/lessons/${lesson.slug}`}
                          className="hover:underline flex items-center gap-1.5"
                        >
                          <span>{lesson.title}</span>
                          <Eye className="w-3 h-3 text-stone-400 hover:text-stone-700" />
                        </Link>
                      </td>

                      <td className="py-3 px-3 text-stone-500 font-mono text-[11px]">{lesson.lesson_date}</td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isPublished
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {isPublished ? "Published" : "Draft"}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/admin/lessons/${lesson.id}/edit`}
                            className="p-1.5 hover:bg-stone-100 text-stone-600 rounded-lg transition"
                            title="Edit Lesson"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            type="button"
                            disabled={deletingId === lesson.id}
                            onClick={() => handleDelete(lesson)}
                            className="p-1.5 hover:bg-red-50 text-stone-400 hover:text-red-600 rounded-lg transition cursor-pointer"
                            title="Delete Lesson"
                          >
                            {deletingId === lesson.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
