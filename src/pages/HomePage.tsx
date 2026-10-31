import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { fetchLessons } from "../lib/supabase"
import { Lesson } from "../types/database"
import { Sparkles, BookOpen, ArrowRight, CheckCircle2, Calendar, Trophy, Users, Star } from "lucide-react"

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

  const todaysClass = dailyClasses[0] || null

  return (
    <div className="space-y-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Hero Card */}
      <div className="rounded-3xl bg-stone-900 border border-stone-800 text-white p-8 sm:p-12 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Speak Fluent English with Zero Hesitation</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Stop translating in your head. Start thinking in English.
          </h1>

          <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
            Daily bite-sized speaking classes crafted for Indian Hindi & Hinglish speakers, paired with an interactive 24/7 AI tutor and community discussions.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {todaysClass ? (
              <Link
                to={`/lessons/${todaysClass.slug}`}
                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-lg flex items-center gap-2"
              >
                <span>Start Today&apos;s Class</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                to="/lessons"
                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-lg flex items-center gap-2"
              >
                <span>Browse Daily Classes</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}

            <Link
              to="/topics"
              className="px-6 py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-sm border border-stone-700 transition flex items-center gap-2"
            >
              <span>Foundational Topics</span>
            </Link>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Today's Class Spotlight */}
      {todaysClass && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <Calendar className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-stone-900">Today&apos;s Featured Class</h2>
            </div>
            <Link
              to="/lessons"
              className="text-xs font-semibold text-emerald-800 hover:underline flex items-center gap-1"
            >
              <span>View All Classes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-900/10 shadow-sm hover:border-emerald-600/40 transition">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-800">
                    {todaysClass.topic || "Daily Class"}
                  </span>
                  <span className="text-xs text-stone-400 font-mono">
                    {new Date(todaysClass.lesson_date).toLocaleDateString([], {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-stone-900">
                  <Link to={`/lessons/${todaysClass.slug}`} className="hover:text-emerald-700 transition">
                    {todaysClass.title}
                  </Link>
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  {todaysClass.introduction || "Master real-world speaking patterns today."}
                </p>
              </div>

              <Link
                to={`/lessons/${todaysClass.slug}`}
                className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs transition flex items-center justify-center gap-2 self-start sm:self-center shadow-xs shrink-0"
              >
                <span>Read Lesson</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Grid: Recent Classes & Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Daily Classes */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Recent Daily Classes</span>
            </h2>
            <Link to="/lessons" className="text-xs text-emerald-800 hover:underline font-semibold">
              See all
            </Link>
          </div>

          <div className="space-y-3">
            {dailyClasses.slice(0, 4).map((lesson) => (
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
            ))}
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
            {topics.slice(0, 4).map((topic) => (
              <Link
                key={topic.id}
                to={`/topics/${topic.slug}`}
                className="block p-4 rounded-2xl bg-white border border-stone-200/90 hover:border-emerald-500/50 hover:shadow-2xs transition group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800">
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
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
