import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { fetchLessons } from "../lib/supabase"
import { Lesson } from "../types/database"
import { Sparkles, BookOpen, ArrowRight, Calendar, Layers } from "lucide-react"

export default function HomePage() {
  const [dailyClasses, setDailyClasses] = useState<Lesson[]>([])
  const [topics, setTopics] = useState<Lesson[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const [classes, top] = await Promise.all([
          fetchLessons({ lessonType: 0, status: 1 }),
          fetchLessons({ lessonType: 1, status: 1 }),
        ])
        setDailyClasses(classes)
        setTopics(top)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const latestClass = dailyClasses[0] || null
  const previousClasses = dailyClasses.length > 1 ? dailyClasses.slice(1, 5) : dailyClasses

  return (
    <div className="space-y-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Latest Class Hero Card */}
      {isLoading ? (
        <div className="rounded-3xl bg-stone-900 border border-stone-800 text-white p-8 sm:p-12 relative overflow-hidden shadow-2xl animate-pulse space-y-4">
          <div className="h-6 w-36 bg-stone-800 rounded-full" />
          <div className="h-10 sm:h-12 w-3/4 bg-stone-800 rounded-2xl" />
          <div className="h-5 w-5/6 bg-stone-800/80 rounded-xl" />
          <div className="h-5 w-2/3 bg-stone-800/60 rounded-xl" />
          <div className="flex gap-3 pt-3">
            <div className="h-11 w-40 bg-emerald-900/60 rounded-2xl" />
            <div className="h-11 w-32 bg-stone-800 rounded-2xl" />
          </div>
        </div>
      ) : latestClass ? (
        <div className="rounded-3xl bg-stone-900 border border-stone-800 text-white p-8 sm:p-12 relative overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-3xl space-y-5">
            {/* Badges / Metadata */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Latest Class</span>
              </span>

              {latestClass.topic && (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-stone-800/90 border border-stone-700/80 text-stone-300 text-xs font-medium">
                  {latestClass.topic}
                </span>
              )}

              {latestClass.lesson_date && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-800/90 border border-stone-700/80 text-stone-400 text-xs font-mono">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  <span>
                    {new Date(latestClass.lesson_date).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </span>
              )}
            </div>

            {/* Class Title */}
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
              <Link to={`/lessons/${latestClass.slug}`} className="hover:text-emerald-300 transition">
                {latestClass.title}
              </Link>
            </h1>

            {/* Introduction / Description */}
            <p className="text-stone-300 text-sm sm:text-base leading-relaxed line-clamp-3">
              {latestClass.introduction ||
                "Master real-world speaking patterns, everyday vocabulary, and natural pronunciation with today's interactive lesson."}
            </p>

            {/* Call to Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Link
                to={`/lessons/${latestClass.slug}`}
                className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-sm transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Start Latest Class</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/lessons"
                className="px-5 py-3.5 rounded-2xl bg-stone-800/90 hover:bg-stone-700 text-stone-200 font-semibold text-sm border border-stone-700/80 transition flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-stone-400" />
                <span>All Classes</span>
              </Link>

              <Link
                to="/topics"
                className="px-5 py-3.5 rounded-2xl bg-stone-800/90 hover:bg-stone-700 text-stone-200 font-semibold text-sm border border-stone-700/80 transition flex items-center gap-2"
              >
                <Layers className="w-4 h-4 text-stone-400" />
                <span>Foundational Topics</span>
              </Link>
            </div>
          </div>

          {/* Decorative ambient background glows */}
          <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 right-1/4 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        </div>
      ) : (
        <div className="rounded-3xl bg-stone-900 border border-stone-800 text-white p-8 sm:p-12 relative overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>English Speaking Hub</span>
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Welcome to Learn English
            </h1>
            <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
              Explore daily classes and foundational grammar topics to build natural English fluency.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/lessons"
                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-lg flex items-center gap-2"
              >
                <span>Browse Classes</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/topics"
                className="px-6 py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-sm border border-stone-700 transition"
              >
                <span>Foundational Topics</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Recent Daily Classes & Foundational Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Daily Classes */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-700" />
              <span>Recent Daily Classes</span>
            </h2>
            <Link to="/lessons" className="text-xs text-emerald-800 hover:underline font-semibold">
              See all
            </Link>
          </div>

          <div className="space-y-3">
            {previousClasses.length === 0 ? (
              <p className="text-xs text-stone-500 py-4">No daily classes found.</p>
            ) : (
              previousClasses.map((lesson) => (
                <Link
                  key={lesson.id}
                  to={`/lessons/${lesson.slug}`}
                  className="block p-4 rounded-2xl bg-white border border-stone-200/90 hover:border-emerald-500/50 hover:shadow-2xs transition group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono">
                          {lesson.lesson_date}
                        </span>
                        {lesson.topic && (
                          <span className="text-[10px] font-semibold text-emerald-700">
                            &bull; {lesson.topic}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-stone-900 group-hover:text-emerald-800 transition">
                        {lesson.title}
                      </h3>
                      <p className="text-xs text-stone-500 line-clamp-1">{lesson.introduction}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-700 group-hover:translate-x-1 transition shrink-0 mt-1" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Foundational Topics */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Foundational Grammar & Speaking</span>
            </h2>
            <Link to="/topics" className="text-xs text-emerald-800 hover:underline font-semibold">
              See all
            </Link>
          </div>

          <div className="space-y-3">
            {topics.length === 0 ? (
              <p className="text-xs text-stone-500 py-4">No topics found.</p>
            ) : (
              topics.slice(0, 4).map((topic) => (
                <Link
                  key={topic.id}
                  to={`/topics/${topic.slug}`}
                  className="block p-4 rounded-2xl bg-white border border-stone-200/90 hover:border-emerald-500/50 hover:shadow-2xs transition group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800">
                          Topic #{topic.position || 1}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-stone-900 group-hover:text-emerald-800 transition">
                        {topic.title}
                      </h3>
                      <p className="text-xs text-stone-500 line-clamp-1">{topic.introduction}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-700 group-hover:translate-x-1 transition shrink-0 mt-1" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
