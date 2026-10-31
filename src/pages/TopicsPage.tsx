import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { fetchLessons } from "../lib/supabase"
import { Lesson } from "../types/database"
import { Sparkles, Search, ArrowRight, Loader2, BookOpen } from "lucide-react"

export default function TopicsPage() {
  const [topics, setTopics] = useState<Lesson[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const data = await fetchLessons({ lessonType: 1, status: 1 })
        setTopics(data)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const filtered = topics.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.topic && t.topic.toLowerCase().includes(search.toLowerCase())) ||
      (t.introduction && t.introduction.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Page Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-emerald-600" />
            <span>Foundational English Curriculum</span>
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Master the core grammar, sentence structuring, and pronunciation foundations step-by-step.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topics..."
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
          />
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Grid of topics */}
      {isLoading ? (
        <div className="text-center py-20 text-stone-400 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
          <span className="text-xs">Loading foundational curriculum...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center text-stone-500 border border-stone-200">
          <p className="font-bold">No topics found.</p>
          <p className="text-xs text-stone-400 mt-1">Try another search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((topic, index) => (
            <Link
              key={topic.id}
              to={`/topics/${topic.slug}`}
              className="bg-white p-5 rounded-2xl border border-stone-200 hover:border-emerald-600/50 hover:shadow-sm transition flex flex-col justify-between group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800">
                    Topic #{topic.position || index + 1}
                  </span>
                  {topic.topic && (
                    <span className="text-[11px] text-stone-400 font-semibold">{topic.topic}</span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-stone-900 group-hover:text-emerald-800 transition line-clamp-2">
                  {topic.title}
                </h3>

                <p className="text-xs text-stone-500 line-clamp-3 leading-relaxed">
                  {topic.introduction || "Foundational English grammar & concept overview."}
                </p>
              </div>

              <div className="pt-4 mt-2 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-emerald-800">
                <span>Start Topic</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

