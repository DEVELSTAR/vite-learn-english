import React, { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { supabase, isSupabaseConfigured, getLessonContent } from "../../lib/supabase"
import { MOCK_LESSONS } from "../../lib/mockData"
import { Lesson } from "../../types/database"
import LessonForm from "../../components/admin/LessonForm"
import { ArrowLeft, Loader2 } from "lucide-react"

export default function EditLessonPage() {
  const { id } = useParams<{ id: string }>()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!id) return
      const lessonId = parseInt(id, 10)
      setIsLoading(true)

      try {
        if (isSupabaseConfigured && supabase) {
          const { data } = await supabase
            .from("lessons")
            .select("*")
            .eq("id", lessonId)
            .single()

          if (data) {
            const body = await getLessonContent(lessonId)
            const item: Lesson = data as Lesson
            item.content = body || item.introduction || ""
            setLesson(item)
          }
        } else {
          const found = MOCK_LESSONS.find((l) => l.id === lessonId) || null
          setLesson(found)
        }
      } catch (err) {
        console.error("Error loading lesson for edit:", err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center gap-2 text-stone-400">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
        <span className="text-xs">Loading lesson data...</span>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-stone-200 text-center space-y-3 max-w-md mx-auto">
        <h2 className="text-base font-bold text-stone-900">Lesson Not Found</h2>
        <p className="text-xs text-stone-500">The lesson ID #{id} was not found in the database.</p>
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    )
  }

  return <LessonForm initialLesson={lesson} isEditing={true} />
}

