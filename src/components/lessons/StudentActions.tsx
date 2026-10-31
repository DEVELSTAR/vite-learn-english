import React, { useState, useEffect } from "react"
import { CheckCircle2, RotateCcw, Loader2 } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { getLessonCompletion, toggleCompletion } from "../../lib/supabase"

interface StudentActionsProps {
  lessonId: number
}

export default function StudentActions({ lessonId }: StudentActionsProps) {
  const { currentUser } = useAuth()
  const [completed, setCompleted] = useState(false)
  const [needsRevision, setNeedsRevision] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    async function check() {
      if (currentUser?.id) {
        const comp = await getLessonCompletion(currentUser.id, lessonId)
        if (comp) {
          setCompleted(comp.completed)
          setNeedsRevision(comp.needs_revision)
        }
      }
    }
    check()
  }, [currentUser?.id, lessonId])

  const handleToggle = async (type: "completed" | "needs_revision") => {
    if (!currentUser) {
      alert("Sign in as a student to track your progress and mark lessons as complete!")
      return
    }

    setIsLoading(true)
    try {
      const updated = await toggleCompletion(currentUser.id, lessonId, type)
      setCompleted(updated.completed)
      setNeedsRevision(updated.needs_revision)
    } catch (err: any) {
      alert(err?.message || "Failed to update lesson status.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <button
        type="button"
        disabled={isLoading}
        onClick={() => handleToggle("completed")}
        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
          completed
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : "bg-white text-stone-700 border border-stone-200 hover:border-emerald-500 hover:bg-emerald-50"
        }`}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <CheckCircle2 className={`w-3.5 h-3.5 ${completed ? "text-white" : "text-emerald-600"}`} />
        )}
        <span>{completed ? "Completed" : "Mark as Complete"}</span>
      </button>

      <button
        type="button"
        disabled={isLoading}
        onClick={() => handleToggle("needs_revision")}
        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
          needsRevision
            ? "bg-amber-600 text-white hover:bg-amber-700"
            : "bg-white text-stone-700 border border-stone-200 hover:border-amber-500 hover:bg-amber-50"
        }`}
      >
        <RotateCcw className={`w-3.5 h-3.5 ${needsRevision ? "text-white" : "text-amber-600"}`} />
        <span>{needsRevision ? "Marked for Revision" : "Needs Revision"}</span>
      </button>
    </div>
  )
}

