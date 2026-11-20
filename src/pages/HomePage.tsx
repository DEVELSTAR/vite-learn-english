import React, { useState, useEffect, useMemo } from "react"
import { Link, Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import {
  fetchLessons,
  fetchUserCompletions,
  fetchUserNotes,
  fetchPendingNoteShares,
} from "../lib/supabase"
import { Lesson, LessonCompletion, Note } from "../types/database"
import {
  Sparkles,
  BookOpen,
  ArrowRight,
  Calendar,
  Layers,
  Mic,
  Volume2,
  VolumeX,
  CheckCircle2,
  Radio,
  FileText,
  User,
  Zap,
  HelpCircle,
  MessageSquare,
  Flame,
  ArrowUpRight,
  Headphones,
  Check,
  RotateCcw,
  Search,
  Loader2,
  Play,
  Square,
  Award,
  Clock,
  ChevronRight,
  AlertCircle,
  Plus,
  Bookmark,
  Bell,
  RefreshCw,
} from "lucide-react"

export default function HomePage() {
  const { currentUser, isAdmin } = useAuth()
  const [dailyClasses, setDailyClasses] = useState<Lesson[]>([])
  const [topics, setTopics] = useState<Lesson[]>([])
  const [completions, setCompletions] = useState<LessonCompletion[]>([])
  const [userNotes, setUserNotes] = useState<Note[]>([])
  const [pendingSharesCount, setPendingSharesCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Interactive controls
  const [activeTab, setActiveTab] = useState<"classes" | "topics" | "revision" | "completed">("classes")
  const [searchQuery, setSearchQuery] = useState("")

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

        if (currentUser?.id) {
          const [comps, notes, shares] = await Promise.all([
            fetchUserCompletions(currentUser.id),
            fetchUserNotes(currentUser.id),
            fetchPendingNoteShares(currentUser.id),
          ])
          setCompletions(comps)
          setUserNotes(notes)
          setPendingSharesCount(shares.length)
        }
      } catch (err) {
        console.error("Error loading home page data:", err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [currentUser?.id])

  const completionMap = useMemo(() => {
    const map = new Map<number, LessonCompletion>()
    for (const c of completions) {
      map.set(c.lesson_id, c)
    }
    return map
  }, [completions])

  const allLessons = useMemo(() => [...dailyClasses, ...topics], [dailyClasses, topics])

  const completedLessons = useMemo(() => {
    return allLessons.filter((l) => completionMap.get(l.id)?.completed)
  }, [allLessons, completionMap])

  const revisionLessons = useMemo(() => {
    return allLessons.filter((l) => completionMap.get(l.id)?.needs_revision)
  }, [allLessons, completionMap])

  const latestClass = dailyClasses[0] || null
  const latestClassCompletion = latestClass ? completionMap.get(latestClass.id) : null

  const totalLessonsCount = allLessons.length
  const completedCount = completedLessons.length
  const revisionCount = revisionLessons.length
  const completionPercentage =
    totalLessonsCount > 0 ? Math.round((completedCount / totalLessonsCount) * 100) : 0

  const filteredList = useMemo(() => {
    let source: Lesson[] = []
    if (activeTab === "classes") source = dailyClasses
    else if (activeTab === "topics") source = topics
    else if (activeTab === "revision") source = revisionLessons
    else if (activeTab === "completed") source = completedLessons

    if (!searchQuery.trim()) return source
    const q = searchQuery.toLowerCase()
    return source.filter(
      (l) => l.title.toLowerCase().includes(q) || (l.topic && l.topic.toLowerCase().includes(q))
    )
  }, [activeTab, dailyClasses, topics, revisionLessons, completedLessons, searchQuery])

  // -------------------------------------------------------------
  // VIEW A: Redesigned Student Learning Dashboard
  // -------------------------------------------------------------
  if (currentUser) {
    if (isAdmin) {
      return <Navigate to="/admin" replace />
    }

    return (
      <div className="space-y-8 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Pending Note Share Alert Banner */}
        {pendingSharesCount > 0 && (
          <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200/90 flex items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                You have <strong>{pendingSharesCount}</strong> pending note share invitation
                {pendingSharesCount > 1 ? "s" : ""} from your classmates!
              </span>
            </div>
            <Link
              to="/notes"
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shrink-0 transition"
            >
              Review in Notes &rarr;
            </Link>
          </div>
        )}

        {/* 1. Today's Focus Class Hero Card */}
        {isLoading ? (
          <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs animate-pulse space-y-4">
            <div className="h-6 w-36 bg-stone-100 rounded-full" />
            <div className="h-8 w-2/3 bg-stone-100 rounded-xl" />
            <div className="h-4 w-4/5 bg-stone-100 rounded-lg" />
          </div>
        ) : latestClass ? (
          <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3.5 max-w-3xl">
              {/* Status Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Today&apos;s Focus Class</span>
                </span>

                {latestClass.topic && (
                  <span className="px-3 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-semibold">
                    {latestClass.topic}
                  </span>
                )}

                {latestClass.lesson_date && (
                  <span className="px-3 py-1 rounded-full bg-stone-50 border border-stone-200 text-stone-500 text-xs font-mono">
                    {latestClass.lesson_date}
                  </span>
                )}

                {latestClassCompletion?.completed ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    <Check className="w-3.5 h-3.5" />
                    <span>Completed</span>
                  </span>
                ) : latestClassCompletion?.needs_revision ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Needs Revision</span>
                  </span>
                ) : null}
              </div>

              {/* Class Title */}
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-stone-900 tracking-tight leading-snug">
                <Link
                  to={`/lessons/${latestClass.id}`}
                  className="hover:text-emerald-700 transition"
                >
                  {latestClass.title}
                </Link>
              </h2>

              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Master real-world speaking patterns, everyday vocabulary, and natural pronunciation with today's interactive lesson.
              </p>
            </div>

            {/* Call to Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <Link
                to={`/lessons/${latestClass.id}`}
                className="px-5 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm transition shadow-xs flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
              >
                <span>
                  {latestClassCompletion?.completed ? "Review Lesson Again" : "Start Today's Class"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to={`/lessons/${latestClass.id}`}
                className="px-4 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2"
              >
                <Mic className="w-4 h-4 text-emerald-700" />
                <span>Ask Akib Sir (Voice)</span>
              </Link>
            </div>
          </div>
        ) : null}

        {/* 2. Key Metrics & Progress Overview (4 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Course Progress */}
          <div className="p-5 rounded-3xl bg-white border border-stone-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500">Course Progress</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-stone-900">
                  {completedCount}{" "}
                  <span className="text-xs font-medium text-stone-400">/ {totalLessonsCount}</span>
                </span>
                <span className="text-xs font-bold text-emerald-700">{completionPercentage}%</span>
              </div>
              <div className="w-full bg-stone-100 rounded-full h-2 mt-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
            <p className="text-[11px] text-stone-500 font-medium">
              {completedCount === totalLessonsCount && totalLessonsCount > 0
                ? "🎉 All published lessons completed!"
                : `${totalLessonsCount - completedCount} lessons remaining`}
            </p>
          </div>

          {/* Card 2: Needs Revision */}
          <div
            onClick={() => setActiveTab("revision")}
            className="p-5 rounded-3xl bg-white border border-stone-200/90 shadow-2xs space-y-3 cursor-pointer hover:border-amber-400 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500">Needs Revision</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-110 transition">
                <RotateCcw className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-black text-stone-900">{revisionCount}</span>
              <span className="text-xs text-stone-400 ml-1">
                {revisionCount === 1 ? "lesson flagged" : "lessons flagged"}
              </span>
            </div>
            <span className="text-[11px] text-amber-700 font-bold flex items-center gap-1 group-hover:underline">
              <span>View revision list</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>

          {/* Card 3: Study Notes */}
          <Link
            to="/notes"
            className="p-5 rounded-3xl bg-white border border-stone-200/90 shadow-2xs space-y-3 hover:border-indigo-400 transition group block"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500">My Study Notes</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:scale-110 transition">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-black text-stone-900">{userNotes.length}</span>
              <span className="text-xs text-stone-400 ml-1">
                {userNotes.length === 1 ? "saved note" : "saved notes"}
              </span>
            </div>
            <span className="text-[11px] text-indigo-700 font-bold flex items-center gap-1 group-hover:underline">
              <span>Open Notes Vault</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </Link>

          {/* Card 4: 24/7 AI Tutor Voice Status */}
          <div className="p-5 rounded-3xl bg-white border border-stone-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500">Akib Sir Voice AI</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <Mic className="w-4 h-4 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-base font-bold text-stone-900">Online &amp; Active</span>
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Voice input with spoken audio explanations in natural Hinglish.
              </p>
            </div>
            {latestClass && (
              <Link
                to={`/lessons/${latestClass.id}`}
                className="text-[11px] text-purple-700 font-bold flex items-center gap-1 hover:underline"
              >
                <span>Practice with Voice</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>

        {/* 4. Curriculum Explorer (Tabs & Live Search) */}
        <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
            {/* Tab Navigation */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("classes")}
                className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                  activeTab === "classes"
                    ? "bg-emerald-800 text-white shadow-xs"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Daily Classes</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                  {dailyClasses.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("topics")}
                className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                  activeTab === "topics"
                    ? "bg-emerald-800 text-white shadow-xs"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Foundational Topics</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                  {topics.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("revision")}
                className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                  activeTab === "revision"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Needs Revision</span>
                {revisionCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-800 text-white">
                    {revisionCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("completed")}
                className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                  activeTab === "completed"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Completed</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                  {completedCount}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search classes..."
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Lesson Cards Grid */}
          {isLoading ? (
            <div className="py-16 text-center text-stone-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              <span className="text-xs">Loading curriculum...</span>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-stone-700">
                {activeTab === "revision"
                  ? "No lessons flagged for revision!"
                  : activeTab === "completed"
                  ? "No lessons completed yet."
                  : "No lessons found matching your search."}
              </p>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {activeTab === "revision"
                  ? "When studying any class, click 'Mark for Revision' to keep tricky concepts right here."
                  : "Start with today's daily class to begin building your streak."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredList.map((lesson, idx) => {
                const comp = completionMap.get(lesson.id)
                const isCompleted = comp?.completed
                const isRevision = comp?.needs_revision
                const isTopic = lesson.lesson_type === 1
                const linkTarget = isTopic ? `/topics/${lesson.id}` : `/lessons/${lesson.id}`

                return (
                  <Link
                    key={lesson.id}
                    to={linkTarget}
                    className="p-5 rounded-2xl bg-white border border-stone-200/90 hover:border-emerald-500/70 hover:shadow-xs transition group flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isTopic ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700">
                              Topic #{idx + 1}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-stone-400 font-semibold">
                              {lesson.lesson_date}
                            </span>
                          )}

                          {lesson.topic && (
                            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                              {lesson.topic}
                            </span>
                          )}
                        </div>

                        {/* Status Tags */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isCompleted && (
                            <span
                              className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center"
                              title="Completed"
                            >
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                          {isRevision && (
                            <span
                              className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center"
                              title="Needs Revision"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-stone-900 group-hover:text-emerald-800 transition line-clamp-2">
                        {lesson.title}
                      </h3>

                      <p className="text-xs text-stone-500 line-clamp-1">
                        {isTopic
                          ? "Foundational English grammar & concept overview."
                          : "Daily practical speaking class with workplace & daily life examples."}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-stone-400 pt-2 border-t border-stone-100">
                      <span className="text-[11px] font-semibold text-emerald-700 group-hover:underline flex items-center gap-1">
                        <span>{isCompleted ? "Review Class" : "Start Class"}</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
                      </span>
                      <span className="text-[10px] flex items-center gap-1">
                        <Mic className="w-3 h-3 text-stone-400" />
                        <span>Voice Enabled</span>
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* 5. Recent Notes Section (If student has notes) */}
        {userNotes.length > 0 && (
          <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-base">
                <FileText className="w-4 h-4 text-emerald-700" />
                <span>Your Recent Study Notes</span>
              </div>
              <Link
                to="/notes"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
              >
                <span>View All ({userNotes.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {userNotes.slice(0, 3).map((note) => (
                <Link
                  key={note.id}
                  to="/notes"
                  className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200/80 hover:border-emerald-500/60 hover:bg-white transition space-y-2 block group"
                >
                  <div className="flex items-center justify-between text-[10px] font-semibold text-stone-400">
                    <span>
                      {new Date(note.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="text-emerald-700 group-hover:underline">Open Note &rarr;</span>
                  </div>
                  <p className="text-xs text-stone-800 line-clamp-3 leading-relaxed font-medium">
                    {note.content}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // -------------------------------------------------------------
  // VIEW B: Redesigned Public Landing Page (For Non-Logged-In Visitors)
  // -------------------------------------------------------------
  return (
    <div className="space-y-16 sm:space-y-24 py-8 sm:py-12 overflow-x-hidden">
      {/* 1. Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-6 sm:space-y-8">
        {/* Top Announcement Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span>New: 24/7 Voice AI Tutor with Spoken Audio Answers</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        </div>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-stone-900 tracking-tight leading-[1.15] max-w-4xl mx-auto">
          Speak English Confidently —{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700">
            Without Fear or Hesitation.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-lg text-stone-600 max-w-2xl mx-auto leading-relaxed">
          Master real-world conversational and workplace English with practical daily classes in simple Hinglish. Speak your questions into the mic and get spoken audio answers from Akib Sir.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
          <Link
            to="/auth/sign-up"
            className="px-7 py-3.5 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm sm:text-base transition shadow-lg shadow-emerald-900/20 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Start Learning Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/auth/sign-in"
            className="px-6 py-3.5 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 font-bold text-sm sm:text-base border border-stone-300 transition flex items-center gap-2 shadow-2xs"
          >
            <span>Student Sign In</span>
            <ArrowUpRight className="w-4 h-4 text-stone-400" />
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs font-medium text-stone-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            100% Free to Join
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Simple Everyday Hinglish
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Voice Questions &amp; Audio Explanations
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Community Study Notes
          </span>
        </div>
      </section>

      {/* 2. Interactive App Preview Showcase */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-b from-stone-900 to-stone-950 p-3 sm:p-5 shadow-2xl border border-stone-800">
          {/* Top Browser Bar */}
          <div className="flex items-center justify-between pb-3 px-2 border-b border-stone-800/80 text-stone-400 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
              <span className="text-[11px] font-mono text-stone-500 ml-2 hidden sm:inline">
                learn-english.akibworks.com
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-emerald-400 font-semibold">Live Interactive Platform</span>
            </div>
          </div>

          {/* Mock App Content */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 text-stone-200">
            {/* Left Column: Lesson Content Preview */}
            <div className="md:col-span-7 bg-stone-900/90 rounded-2xl p-5 border border-stone-800 space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  Daily Class
                </span>
                <span className="text-[11px] text-stone-400 font-mono">Today&apos;s Focus</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
                How to use &ldquo;Afford&rdquo; in Indian Workplace Conversations
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                Log sochte hain <em>afford</em> sirf paise ke liye use hota hai. Lekin native speakers isko <strong>time, risk,</strong> aur <strong>mistakes</strong> ke liye bhi bolte hain:
              </p>
              <div className="p-3 bg-stone-950/80 rounded-xl border border-stone-800/80 text-xs space-y-1.5 font-mono">
                <p className="text-emerald-400">&bull; &ldquo;We cannot afford to miss this deadline.&rdquo;</p>
                <p className="text-stone-400 text-[11px]">Hinglish: Hum ye deadline miss karna bilkul risk nahi le sakte.</p>
              </div>
            </div>

            {/* Right Column: AI Voice Tutor Mock */}
            <div className="md:col-span-5 bg-stone-900/90 rounded-2xl p-4 border border-stone-800 space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-700 text-white flex items-center justify-center text-xs font-bold">
                    ✨
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block leading-tight">Ask Akib Sir</span>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Voice Model Active
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 text-[10px] font-bold border border-emerald-700/40">
                  🔊 Audio ON
                </span>
              </div>

              {/* Chat snippet */}
              <div className="space-y-2 text-xs">
                {/* Student Voice Question */}
                <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-white space-y-1">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-300">
                    <Mic className="w-3 h-3" />
                    <span>Voice Question (Recorded)</span>
                  </div>
                  <p className="text-[11px]">&ldquo;Sir, can I say: I cannot afford to lose my job?&rdquo;</p>
                </div>

                {/* AI Tutor Audio Response */}
                <div className="p-2.5 rounded-xl bg-stone-800/80 border border-stone-700/60 text-stone-200 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <Volume2 className="w-3 h-3" />
                      Akib Sir Answered in Audio
                    </span>
                    <span className="text-stone-400 font-mono">1.0x</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-stone-300">
                    &ldquo;Bilkul correct! 100% natural hai. Yahan aap bol rahe hain ki job khona aapke liye bahut bada nuksan hoga.&rdquo;
                  </p>
                </div>
              </div>

              {/* Input trigger */}
              <div className="p-2 bg-stone-950/90 rounded-xl border border-stone-800 flex items-center justify-between text-xs text-stone-400">
                <span className="text-[11px] flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                  Tap mic to speak your question...
                </span>
                <span className="w-6 h-6 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
                  <Mic className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Features Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold tracking-wider uppercase text-emerald-800 bg-emerald-100/70 px-3 py-1 rounded-full">
            Why Students Love Learning Here
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight">
            Designed for Hindi Speakers who want to speak fluent English
          </h2>
          <p className="text-xs sm:text-sm text-stone-600">
            No endless grammar charts or outdated textbook rules. Only practical tools that help you speak confidently.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Feature 1 */}
          <div className="p-6 rounded-3xl bg-white border border-stone-200 hover:border-emerald-500/50 hover:shadow-md transition space-y-3 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-110 transition">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900 group-hover:text-emerald-800 transition">
              Voice AI Tutor (Akib Sir)
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Record your questions via mic. Akib Sir understands Indian accents, corrects your sentences, and explains back in audio.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-6 rounded-3xl bg-white border border-stone-200 hover:border-emerald-500/50 hover:shadow-md transition space-y-3 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-110 transition">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900 group-hover:text-emerald-800 transition">
              Zero-Jargon Hinglish
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Difficult English concepts explained in natural everyday Hinglish with fresh analogies so you never forget them.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-6 rounded-3xl bg-white border border-stone-200 hover:border-emerald-500/50 hover:shadow-md transition space-y-3 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-110 transition">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900 group-hover:text-emerald-800 transition">
              Daily Practical Classes
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              A new high-yield lesson every single day. Master words used in meetings, client calls, emails, and daily Indian life.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-6 rounded-3xl bg-white border border-stone-200 hover:border-emerald-500/50 hover:shadow-md transition space-y-3 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-110 transition">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900 group-hover:text-emerald-800 transition">
              Interactive Study Notes
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Create your own personal notes, post example sentences, and react to fellow classmates using custom background-free avatars.
            </p>
          </div>
        </div>
      </section>

      {/* 4. How It Works (3 Simple Steps) */}
      <section className="bg-stone-50 border-y border-stone-200 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Simple 3-Step Routine
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Spend 10 minutes a day to speak fluent English
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="p-6 rounded-3xl bg-white border border-stone-200 space-y-3 relative shadow-2xs">
              <span className="w-9 h-9 rounded-xl bg-emerald-800 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                1
              </span>
              <h3 className="text-base font-bold text-stone-900">Read Today&apos;s Daily Class</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Log in and read today&apos;s focused lesson. See natural dialogues and understand how native speakers think.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-3xl bg-white border border-stone-200 space-y-3 relative shadow-2xs">
              <span className="w-9 h-9 rounded-xl bg-emerald-800 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                2
              </span>
              <h3 className="text-base font-bold text-stone-900">Ask Akib Sir with Voice</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Tap the microphone, say your own practice sentence, and listen to Akib Sir validate and polish your pronunciation.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-3xl bg-white border border-stone-200 space-y-3 relative shadow-2xs">
              <span className="w-9 h-9 rounded-xl bg-emerald-800 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                3
              </span>
              <h3 className="text-base font-bold text-stone-900">Save to Personal Notes</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Add phrases to your study notes, earn reactions from fellow students, and revise anytime on your phone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Live Classes Showcase (Database Driven) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 pb-4">
          <div>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
              Explore Our Curriculum
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Latest Daily Classes &amp; Foundational Topics
            </h2>
          </div>
          <Link
            to="/auth/sign-up"
            className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1"
          >
            <span>Create free account to access all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Latest Daily Class Card */}
          {latestClass && (
            <div className="p-6 rounded-3xl bg-white border border-stone-200 hover:border-emerald-500/50 hover:shadow-md transition space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                  Latest Daily Class
                </span>
                <span className="text-xs font-mono text-stone-400">{latestClass.lesson_date}</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-stone-900 leading-snug">
                {latestClass.title}
              </h3>
              <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed">
                Daily practical speaking class with workplace and daily life examples.
              </p>
              <Link
                to="/auth/sign-up"
                className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 hover:text-emerald-900 pt-2"
              >
                <span>Sign up to open full lesson</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Topics Preview List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
              Foundational Topics
            </h4>
            {topics.slice(0, 3).map((top, index) => (
              <div
                key={top.id}
                className="p-4 rounded-2xl bg-white border border-stone-200 flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700">
                      Topic #{index + 1}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-stone-900">{top.title}</h4>
                  <p className="text-xs text-stone-500 line-clamp-1">Foundational English grammar & concept overview.</p>
                </div>
                <Link
                  to="/auth/sign-up"
                  className="p-2 rounded-xl text-stone-400 hover:text-emerald-700 hover:bg-stone-50 shrink-0"
                  title="Unlock topic"
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. About Akib Sir & Philosophy */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="p-8 sm:p-10 rounded-3xl bg-stone-900 text-white space-y-6 relative overflow-hidden shadow-xl">
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
              <span>Meet Your Teacher</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              &ldquo;English is not an exam to pass. It is a tool to express your ideas.&rdquo;
            </h2>
            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
              I created this platform under <strong>AkibWorks</strong> because most coaching institutes focus on memorizing obscure grammatical rules rather than speaking with confidence. Here, you learn how English feels and sounds in real conversations — with patience, friendly Hinglish, and modern AI voice practice.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white font-bold flex items-center justify-center text-sm">
                AS
              </div>
              <div>
                <span className="text-sm font-bold block text-white">Akib Sir</span>
                <span className="text-xs text-stone-400">Founder &amp; English Educator, AkibWorks</span>
              </div>
            </div>
          </div>
          <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        </div>
      </section>

      {/* 7. Bottom High-Converting CTA Banner */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-3 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Ready to overcome your hesitation and speak English fluently?
            </h2>
            <p className="text-xs sm:text-base text-emerald-100">
              Join free today. Start with today&apos;s daily class and talk to your personal AI Tutor with voice in minutes.
            </p>
            <div className="pt-3 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                to="/auth/sign-up"
                className="px-8 py-3.5 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-950 font-black text-sm sm:text-base transition shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <span>Create Your Free Account</span>
                <ArrowRight className="w-4 h-4 text-emerald-800" />
              </Link>
            </div>
            <p className="text-[11px] text-emerald-200/80 pt-1">
              No credit card required &bull; Takes 10 seconds to join
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
