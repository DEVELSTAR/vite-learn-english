import React, { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { fetchLessonBySlug } from "../lib/supabase"
import { Lesson } from "../types/database"
import { useAuth } from "../context/AuthContext"
import LessonSidebar from "../components/sidebar/LessonSidebar"
import StudentActions from "../components/lessons/StudentActions"
import { ArrowLeft, ArrowRight, Calendar, Sparkles, BookOpen, Edit2, Loader2 } from "lucide-react"

export default function LessonDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { isAdmin } = useAuth()

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [previousLesson, setPreviousLesson] = useState<Pick<Lesson, "title" | "slug" | "lesson_date" | "lesson_type"> | null>(null)
  const [nextLesson, setNextLesson] = useState<Pick<Lesson, "title" | "slug" | "lesson_date" | "lesson_type"> | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!slug) return
      setIsLoading(true)
      try {
        const res = await fetchLessonBySlug(slug)
        setLesson(res.lesson)
        setPreviousLesson(res.previousLesson)
        setNextLesson(res.nextLesson)
      } finally {
        setIsLoading(false)
      }
    }
    load()
    window.scrollTo(0, 0)
  }, [slug])

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center gap-2 text-stone-500">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
        <span className="text-xs font-semibold">Loading lesson content...</span>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="max-w-2xl mx-auto my-16 p-8 bg-white border border-stone-200 rounded-3xl text-center space-y-4">
        <h1 className="text-xl font-bold text-stone-900">Lesson Not Found</h1>
        <p className="text-xs text-stone-500">The lesson you are looking for may have been moved or removed.</p>
        <Link
          to="/lessons"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 text-white rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Classes</span>
        </Link>
      </div>
    )
  }

  const isTopic = lesson.lesson_type === 1

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Admin Preview & Quick Edit Bar */}
      {isAdmin && (
        <div className="bg-stone-900 text-stone-200 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs border border-stone-800 shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold">
              Admin Preview: {lesson.status === 1 ? "Published" : "Draft (Hidden from students)"}
            </span>
          </div>
          <Link
            to={`/admin/lessons/${lesson.id}/edit`}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold flex items-center gap-1.5 transition"
          >
            <Edit2 className="w-3 h-3 text-emerald-400" />
            <span>Edit This Lesson</span>
          </Link>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left / Top: Lesson Text */}
        <article className="lg:col-span-7 bg-white p-6 sm:p-10 rounded-3xl border border-stone-200/90 shadow-sm space-y-6 order-1">
          {/* Metadata */}
          <div className="space-y-3 border-b border-stone-100 pb-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    isTopic ? "bg-emerald-50 text-emerald-800" : "bg-blue-50 text-blue-800"
                  }`}
                >
                  {isTopic ? `Topic #${lesson.position || 1}` : lesson.topic || "Daily Class"}
                </span>

                <span className="text-xs text-stone-400 font-mono flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{lesson.lesson_date}</span>
                </span>
              </div>

              {/* Student Progress Trackers */}
              <StudentActions lessonId={lesson.id} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight leading-tight">
              {lesson.title}
            </h1>

            {lesson.introduction && (
              <p className="text-sm text-stone-600 italic bg-stone-50 p-3.5 rounded-xl border border-stone-200/60 leading-relaxed">
                {lesson.introduction}
              </p>
            )}
          </div>

          {/* Render Rich Body (HTML from ActionText or formatted markdown) */}
          <div
            className="prose-lesson"
            dangerouslySetInnerHTML={{
              __html:
                lesson.content ||
                "<p class='text-stone-400 italic'>No rich content has been added to this lesson yet.</p>",
            }}
          />

          {/* Navigation to Previous & Next Lesson */}
          <div className="pt-6 border-t border-stone-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                {previousLesson && (
                  <Link
                    to={previousLesson.lesson_type === 1 ? `/topics/${previousLesson.slug}` : `/lessons/${previousLesson.slug}`}
                    className="block p-4 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-stone-50 hover:border-stone-400 transition"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                      &larr; {isTopic ? "Previous Topic" : "Previous Class"}
                    </span>
                    <span className="text-xs font-bold text-stone-900 line-clamp-1">
                      {previousLesson.title}
                    </span>
                  </Link>
                )}
              </div>

              <div className="text-right">
                {nextLesson && (
                  <Link
                    to={nextLesson.lesson_type === 1 ? `/topics/${nextLesson.slug}` : `/lessons/${nextLesson.slug}`}
                    className="block p-4 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-stone-50 hover:border-stone-400 transition"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                      {isTopic ? "Next Topic" : "Next Class"} &rarr;
                    </span>
                    <span className="text-xs font-bold text-stone-900 line-clamp-1">
                      {nextLesson.title}
                    </span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </article>

        {/* Right (Desktop) / Bottom (Mobile): Permanently Open Lesson Tools Sidebar */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 order-2 w-full">
          <LessonSidebar lesson={lesson} />
        </div>
      </div>
    </div>
  )
}

