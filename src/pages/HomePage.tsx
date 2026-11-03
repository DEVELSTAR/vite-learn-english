import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { fetchLessons } from "../lib/supabase"
import { Lesson } from "../types/database"
import { getUserProfileIcon } from "../lib/profileIcons"
import {
  Sparkles,
  BookOpen,
  ArrowRight,
  Calendar,
  Layers,
  Mic,
  Volume2,
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
} from "lucide-react"

export default function HomePage() {
  const { currentUser } = useAuth()
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

  // -------------------------------------------------------------
  // VIEW A: Logged-in Student Learning Hub / Dashboard
  // -------------------------------------------------------------
  if (currentUser) {
    return (
      <div className="space-y-8 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-gradient-to-r from-emerald-900/10 via-emerald-800/5 to-transparent rounded-3xl border border-emerald-900/10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-200/80 flex items-center justify-center text-2xl shadow-xs shrink-0 select-none">
              {getUserProfileIcon(currentUser)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                  Namaste, {currentUser.name}! 🙏
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
                Ready for today&apos;s speaking practice? Consistency is the key to natural fluency.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/lessons"
              className="px-3.5 py-2 rounded-xl bg-white border border-stone-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-stone-700 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
              <span>All Classes</span>
            </Link>
            <Link
              to="/notes"
              className="px-3.5 py-2 rounded-xl bg-white border border-stone-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-stone-700 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-700" />
              <span>My Notes</span>
            </Link>
            <Link
              to="/profile"
              className="px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile</span>
            </Link>
          </div>
        </div>

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
          <div className="rounded-3xl bg-stone-900 border border-stone-800 text-white p-6 sm:p-10 md:p-12 relative overflow-hidden shadow-2xl">
            <div className="relative z-10 max-w-3xl space-y-4 sm:space-y-5">
              {/* Badges / Metadata */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Today&apos;s Class</span>
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
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
                <Link to={`/lessons/${latestClass.slug}`} className="hover:text-emerald-300 transition">
                  {latestClass.title}
                </Link>
              </h2>

              {/* Introduction / Description */}
              <p className="text-stone-300 text-xs sm:text-sm md:text-base leading-relaxed line-clamp-3">
                {latestClass.introduction ||
                  "Master real-world speaking patterns, everyday vocabulary, and natural pronunciation with today's interactive lesson."}
              </p>

              {/* Call to Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to={`/lessons/${latestClass.slug}`}
                  className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-sm transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Start Today&apos;s Class</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to={`/lessons/${latestClass.slug}`}
                  className="px-5 py-3 rounded-2xl bg-stone-800/90 hover:bg-stone-700 text-stone-200 font-semibold text-sm border border-stone-700/80 transition flex items-center gap-2"
                >
                  <Mic className="w-4 h-4 text-emerald-400" />
                  <span>Ask Akib Sir with Voice</span>
                </Link>
              </div>
            </div>

            {/* Ambient background glows */}
            <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-0 right-1/4 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
          </div>
        ) : null}

        {/* 24/7 Voice AI Tutor Spotlight Banner */}
        <div className="p-5 sm:p-6 rounded-3xl bg-emerald-50 border border-emerald-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Mic className="w-6 h-6 text-emerald-200 animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-200/70 px-2 py-0.5 rounded-full">
                  Voice Model Activated
                </span>
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                  <Volume2 className="w-3.5 h-3.5" />
                  Spoken Audio Answers
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-stone-900">
                Practice Speaking with Akib Sir anytime
              </h3>
              <p className="text-xs text-stone-600">
                Tap the microphone in any lesson to speak your doubts, test sentences, and listen to explanations in audio.
              </p>
            </div>
          </div>

          {latestClass && (
            <Link
              to={`/lessons/${latestClass.slug}`}
              className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center justify-center gap-2 transition shrink-0 shadow-2xs"
            >
              <span>Try Voice Practice</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

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
                See all classes &rarr;
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
                See all topics &rarr;
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
                {latestClass.introduction || "Daily practical speaking class with workplace and daily life examples."}
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
            {topics.slice(0, 3).map((top) => (
              <div
                key={top.id}
                className="p-4 rounded-2xl bg-white border border-stone-200 flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700">
                      Topic #{top.position || 1}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-stone-900">{top.title}</h4>
                  <p className="text-xs text-stone-500 line-clamp-1">{top.introduction}</p>
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
