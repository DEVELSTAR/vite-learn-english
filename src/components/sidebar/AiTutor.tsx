import React, { useState, useEffect, useRef } from "react"
import { Send, Bot, User, Sparkles, AlertCircle, Loader2, Pencil, Trash2, Check, X, RotateCcw } from "lucide-react"
import { Lesson } from "../../types/database"
import { useAuth } from "../../context/AuthContext"
import {
  fetchLessonChatMessages,
  saveLessonChatMessage,
  updateLessonChatMessage,
  deleteLessonChatMessage,
  clearLessonChatMessages,
} from "../../lib/supabase"
import { sendGeminiChatMessage } from "../../lib/gemini"
import ReactionBar from "../common/ReactionBar"

interface Message {
  id?: number
  role: "user" | "model"
  content: string
  created_at?: string
}

interface AiTutorProps {
  lesson: Lesson
}

export default function AiTutor({ lesson }: AiTutorProps) {
  const { currentUser } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isInitialMount = useRef(true)

  // Editing state
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editInput, setEditInput] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ""

  useEffect(() => {
    async function loadHistory() {
      if (currentUser?.id) {
        const history = await fetchLessonChatMessages(lesson.id, currentUser.id)
        if (history && history.length > 0) {
          setMessages(
            history.map((m) => ({
              id: m.id,
              role: m.role === "assistant" || m.role === "model" ? "model" : "user",
              content: m.content,
              created_at: m.created_at,
            }))
          )
        }
      }
    }
    loadHistory()
  }, [lesson.id, currentUser?.id])

  useEffect(() => {
    if (!scrollContainerRef.current) return

    if (isInitialMount.current) {
      isInitialMount.current = false
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
      return
    }

    scrollContainerRef.current.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages, isLoading])

  const handleSend = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault()
    const textToSend = customPrompt || input.trim()
    if (!textToSend || isLoading) return

    setInput("")
    setError(null)

    // Save user message to database if logged in
    let userDbId: number | undefined
    if (currentUser?.id) {
      try {
        const saved = await saveLessonChatMessage(lesson.id, currentUser.id, "user", textToSend)
        userDbId = saved.id
      } catch (err) {
        console.error("Failed to save user chat message:", err)
      }
    }

    const userMsg: Message = { id: userDbId, role: "user", content: textToSend }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setIsLoading(true)

    try {
      if (!apiKey) {
        await new Promise((r) => setTimeout(r, 800))
        const demoReply = `Hello ${currentUser?.name || "there"}! I'm your AI English Tutor. To activate real-time Gemini AI explanations, please add your VITE_GEMINI_API_KEY in your environment variables. In this lesson "${lesson.title}", remember to focus on natural usage rather than direct translation!`
        setMessages((prev) => [...prev, { role: "model", content: demoReply }])
        setIsLoading(false)
        return
      }

      const systemInstruction = `You are "Akib Sir", a friendly, patient, and highly practical AI English Tutor for Indian learners speaking Hindi/Urdu.
The current lesson is titled "${lesson.title}".
Lesson Introduction: "${lesson.introduction || "General English Practice"}".
Lesson Content Summary: "${lesson.content ? lesson.content.replace(/<[^>]*>/g, "").slice(0, 800) : "Learn English daily."}".
Always provide concise, encouraging, and clear explanations. Use Hinglish sparingly to clarify difficult points, but encourage the student to think in English. Keep answers engaging and under 4-5 sentences when possible.`

      const { reply } = await sendGeminiChatMessage({
        apiKey,
        messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        userMessage: textToSend,
        systemInstruction,
      })

      let modelDbId: number | undefined
      if (currentUser?.id) {
        try {
          const savedModelMsg = await saveLessonChatMessage(lesson.id, currentUser.id, "model", reply)
          modelDbId = savedModelMsg.id
        } catch (err) {
          console.error("Failed to save model chat message:", err)
        }
      }

      setMessages((prev) => [...prev, { id: modelDbId, role: "model", content: reply }])
    } catch (err: any) {
      console.error("Gemini API error:", err)
      setError(err?.message || "Failed to get AI response. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const startEdit = (idx: number, currentText: string) => {
    setEditingIdx(idx)
    setEditInput(currentText)
  }

  const cancelEdit = () => {
    setEditingIdx(null)
    setEditInput("")
  }

  const handleSaveEdit = async (idx: number, reAsk = false) => {
    const msg = messages[idx]
    if (!msg || !editInput.trim() || isUpdating) return

    setIsUpdating(true)
    const newText = editInput.trim()

    try {
      if (msg.id && currentUser?.id) {
        await updateLessonChatMessage(msg.id, currentUser.id, newText)
      }

      const nextMessages = [...messages]
      nextMessages[idx] = { ...msg, content: newText }
      setMessages(nextMessages)
      setEditingIdx(null)
      setEditInput("")

      if (reAsk) {
        // Re-ask Gemini for this updated prompt
        setIsLoading(true)
        setError(null)
        try {
          const systemInstruction = `You are "Akib Sir", a friendly, patient, and highly practical AI English Tutor for Indian learners speaking Hindi/Urdu.
The current lesson is titled "${lesson.title}".
Lesson Introduction: "${lesson.introduction || "General English Practice"}".
Lesson Content Summary: "${lesson.content ? lesson.content.replace(/<[^>]*>/g, "").slice(0, 800) : "Learn English daily."}".
Always provide concise, encouraging, and clear explanations. Use Hinglish sparingly to clarify difficult points, but encourage the student to think in English. Keep answers engaging and under 4-5 sentences when possible.`

          const { reply } = await sendGeminiChatMessage({
            apiKey,
            messages: nextMessages.slice(0, idx).map((m) => ({ role: m.role, content: m.content })),
            userMessage: newText,
            systemInstruction,
          })

          let modelDbId: number | undefined
          if (currentUser?.id) {
            const saved = await saveLessonChatMessage(lesson.id, currentUser.id, "model", reply)
            modelDbId = saved.id
          }

          setMessages((prev) => [...prev, { id: modelDbId, role: "model", content: reply }])
        } catch (apiErr: any) {
          setError(apiErr?.message || "Failed to get fresh AI response.")
        } finally {
          setIsLoading(false)
        }
      }
    } catch (err: any) {
      alert(err?.message || "Failed to update chat message.")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteMessage = async (idx: number) => {
    const msg = messages[idx]
    if (!msg) return
    if (!confirm("Are you sure you want to delete this message?")) return

    try {
      if (msg.id && currentUser?.id) {
        await deleteLessonChatMessage(msg.id, currentUser.id)
      }
      setMessages((prev) => prev.filter((_, i) => i !== idx))
      if (editingIdx === idx) cancelEdit()
    } catch (err: any) {
      alert(err?.message || "Failed to delete chat message.")
    }
  }

  const handleClearHistory = async () => {
    if (!messages.length) return
    if (!confirm("Clear your AI Tutor conversation history for this lesson?")) return

    try {
      if (currentUser?.id) {
        await clearLessonChatMessages(lesson.id, currentUser.id)
      }
      setMessages([])
      cancelEdit()
    } catch (err: any) {
      alert(err?.message || "Failed to clear chat history.")
    }
  }

  return (
    <div className="flex flex-col h-[480px] lg:h-[520px]">
      {/* Header bar */}
      <div className="p-3 bg-emerald-900/5 border-b border-emerald-900/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-stone-900 block leading-tight">Akib Sir (AI Tutor)</span>
            <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Online &bull; 24/7 Practice
            </span>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClearHistory}
            className="text-[11px] text-stone-400 hover:text-red-600 transition flex items-center gap-1 px-2 py-1 rounded-md hover:bg-stone-100 cursor-pointer"
            title="Clear conversation"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
        {messages.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-stone-800">Have questions about {lesson.title}?</p>
              <p className="text-[11px] text-stone-500 max-w-xs mx-auto">
                Ask Akib Sir to clarify pronunciations, provide sentence examples, or test your speaking!
              </p>
            </div>

            {/* Quick Starters */}
            <div className="flex flex-col gap-1.5 pt-2 max-w-xs mx-auto">
              <button
                type="button"
                onClick={() => handleSend(undefined, "Can you give me 3 practical sentence examples for this lesson?")}
                className="text-left px-3 py-1.5 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-50 text-stone-700 transition cursor-pointer"
              >
                &bull; Give 3 practical sentence examples
              </button>
              <button
                type="button"
                onClick={() => handleSend(undefined, "Quiz me on this lesson with one question!")}
                className="text-left px-3 py-1.5 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-50 text-stone-700 transition cursor-pointer"
              >
                &bull; Quiz me on this lesson with 1 question
              </button>
              <button
                type="button"
                onClick={() => handleSend(undefined, "Explain the core concept in simple Hinglish.")}
                className="text-left px-3 py-1.5 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-50 text-stone-700 transition cursor-pointer"
              >
                &bull; Explain in simple Hinglish
              </button>
            </div>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isEditingThis = editingIdx === idx
            const isUser = m.role === "user"

            return (
              <div
                key={idx}
                className={`group flex items-start gap-1.5 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-5 h-5 rounded-md bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                    AI
                  </div>
                )}

                {/* Edit Form or Message Bubble */}
                {isEditingThis ? (
                  <div className="w-[85%] bg-stone-50 p-2.5 rounded-xl border border-emerald-400 space-y-2 shadow-sm">
                    <textarea
                      value={editInput}
                      onChange={(e) => setEditInput(e.target.value)}
                      rows={2}
                      className="w-full p-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-white"
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-2 py-1 rounded text-[10px] text-stone-500 hover:bg-stone-200 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!editInput.trim() || isUpdating}
                        onClick={() => handleSaveEdit(idx, false)}
                        className="px-2.5 py-1 rounded bg-stone-700 hover:bg-stone-800 disabled:opacity-50 text-white font-semibold text-[10px] flex items-center gap-1 transition cursor-pointer"
                        title="Update text in history"
                      >
                        {isUpdating ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Check className="w-2.5 h-2.5" />}
                        <span>Save</span>
                      </button>
                      <button
                        type="button"
                        disabled={!editInput.trim() || isUpdating || isLoading}
                        onClick={() => handleSaveEdit(idx, true)}
                        className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-[10px] flex items-center gap-1 transition cursor-pointer"
                        title="Save and get a fresh response from AI Tutor"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Save & Re-ask</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative max-w-[85%] space-y-1">
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? "bg-emerald-800 text-white rounded-tr-xs"
                          : "bg-stone-100 text-stone-800 rounded-tl-xs border border-stone-200"
                      }`}
                    >
                      {m.content}
                    </div>

                    {/* Reactions & Action buttons */}
                    <div
                      className={`flex flex-wrap items-center gap-1.5 px-1 ${
                        isUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      <ReactionBar
                        entityType="ai_chat"
                        entityId={m.id ? `id_${m.id}` : `idx_${idx}_${lesson.id}`}
                        align={isUser ? "right" : "left"}
                      />

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        {isUser && (
                          <button
                            type="button"
                            onClick={() => startEdit(idx, m.content)}
                            className="text-[10px] text-stone-400 hover:text-emerald-700 flex items-center gap-0.5 cursor-pointer p-0.5"
                            title="Edit message"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                            <span>Edit</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(idx)}
                          className="text-[10px] text-stone-400 hover:text-red-600 flex items-center gap-0.5 cursor-pointer p-0.5"
                          title="Delete message"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {isUser && (
                  <div className="w-5 h-5 rounded-md bg-stone-300 text-stone-700 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                    <User className="w-3 h-3" />
                  </div>
                )}
              </div>
            )
          })
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-stone-400 text-xs italic">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            <span>Akib Sir is thinking...</span>
          </div>
        )}

        {error && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-[11px] flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <form onSubmit={(e) => handleSend(e)} className="p-2.5 border-t border-stone-200 bg-white flex gap-1.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Akib Sir a question..."
          className="flex-1 px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="px-3 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-40 text-white rounded-xl transition flex items-center justify-center cursor-pointer shadow-xs"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  )
}
