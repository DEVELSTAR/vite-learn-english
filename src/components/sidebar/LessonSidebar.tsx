import React, { useState, useEffect } from "react"
import { Sparkles, MessageCircle, FileText } from "lucide-react"
import { Lesson } from "../../types/database"
import AiTutor from "./AiTutor"
import ChatRoom from "./ChatRoom"
import LessonNotes from "./LessonNotes"

interface LessonSidebarProps {
  lesson: Lesson
}

type TabType = "ai_tutor" | "chatroom" | "notes"

export default function LessonSidebar({ lesson }: LessonSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>("ai_tutor")
  const [commentsCount, setCommentsCount] = useState<number>(0)
  const [notesCount, setNotesCount] = useState<number>(0)

  useEffect(() => {
    try {
      const savedTab = localStorage.getItem("lesson_sidebar_tab") as TabType | null
      if (savedTab && ["ai_tutor", "chatroom", "notes"].includes(savedTab)) {
        setActiveTab(savedTab)
      }
    } catch {
      // ignore
    }
  }, [])

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    try {
      localStorage.setItem("lesson_sidebar_tab", tab)
    } catch {
      // ignore
    }
  }

  return (
    <aside className="w-full rounded-2xl border border-emerald-900/15 bg-white/95 backdrop-blur-xs shadow-sm overflow-hidden flex flex-col h-full lg:max-h-[calc(100vh-6.5rem)]">
      {/* Tab Navigation Header - ALWAYS OPEN, NEVER MINIMIZED */}
      <div className="relative z-30 p-2 sm:p-2.5 bg-stone-50/90 border-b border-stone-200/80 shrink-0">
        <div className="grid grid-cols-3 gap-1.5 w-full">
          {/* Tab 1: AI Tutor */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleTabChange("ai_tutor")
            }}
            className={`touch-manipulation px-2 sm:px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === "ai_tutor"
                ? "bg-emerald-800 text-white shadow-xs"
                : "bg-white text-stone-700 border border-stone-200/90 hover:border-emerald-600/40 hover:bg-stone-50"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">AI Tutor</span>
          </button>

          {/* Tab 2: Discussion */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleTabChange("chatroom")
            }}
            className={`touch-manipulation px-2 sm:px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === "chatroom"
                ? "bg-emerald-800 text-white shadow-xs"
                : "bg-white text-stone-700 border border-stone-200/90 hover:border-blue-600/40 hover:bg-stone-50"
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate">Discussion</span>
            {commentsCount > 0 && (
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                  activeTab === "chatroom"
                    ? "bg-white/20 text-white"
                    : "bg-stone-100 text-stone-700"
                }`}
              >
                {commentsCount}
              </span>
            )}
          </button>

          {/* Tab 3: Notes */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleTabChange("notes")
            }}
            className={`touch-manipulation px-2 sm:px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === "notes"
                ? "bg-emerald-800 text-white shadow-xs"
                : "bg-white text-stone-700 border border-stone-200/90 hover:border-amber-600/40 hover:bg-stone-50"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">Notes</span>
            {notesCount > 0 && (
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                  activeTab === "notes"
                    ? "bg-white/20 text-white"
                    : "bg-stone-100 text-stone-700"
                }`}
              >
                {notesCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "ai_tutor" && <AiTutor lesson={lesson} />}
        {activeTab === "chatroom" && (
          <ChatRoom lesson={lesson} onCommentCountChange={setCommentsCount} />
        )}
        {activeTab === "notes" && (
          <LessonNotes lesson={lesson} onNotesCountChange={setNotesCount} />
        )}
      </div>
    </aside>
  )
}
