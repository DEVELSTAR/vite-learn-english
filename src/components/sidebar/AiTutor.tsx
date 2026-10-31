import React, { useState, useEffect, useRef } from "react"
import { Send, Bot, User, Sparkles, AlertCircle, Loader2 } from "lucide-react"
import { Lesson } from "../../types/database"
import { useAuth } from "../../context/AuthContext"
import { fetchLessonChatMessages, saveLessonChatMessage } from "../../lib/supabase"
import { sendGeminiChatMessage, ChatMessage } from "../../lib/gemini"

interface Message {
  role: "user" | "model"
  content: string
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ""

  useEffect(() => {
    async function loadHistory() {
      if (currentUser?.id) {
        const history = await fetchLessonChatMessages(lesson.id, currentUser.id)
        if (history && history.length > 0) {
          setMessages(
            history.map((m) => ({
              role: m.role === "assistant" || m.role === "model" ? "model" : "user",
              content: m.content,
            }))
          )
        }
      }
    }
    loadHistory()
  }, [lesson.id, currentUser?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  const handleSend = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault()
    const textToSend = customPrompt || input.trim()
    if (!textToSend || isLoading) return

    setInput("")
    setError(null)

    const userMsg: Message = { role: "user", content: textToSend }
    setMessages((prev) => [...prev, userMsg])
    setIsLoading(true)

    // Save user message to database if logged in
    if (currentUser?.id) {
      saveLessonChatMessage(lesson.id, currentUser.id, "user", textToSend).catch(console.error)
    }

    try {
      if (!apiKey) {
        // Simulated helpful response if API key not provided yet
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
        messages,
        userMessage: textToSend,
        systemInstruction,
      })

      setMessages((prev) => [...prev, { role: "model", content: reply }])

      // Save model reply to database
      if (currentUser?.id) {
        saveLessonChatMessage(lesson.id, currentUser.id, "model", reply).catch(console.error)
      }
    } catch (err: any) {
      console.error("Gemini API error:", err)
      setError(err?.message || "Failed to get AI response. Please try again.")
    } finally {
      setIsLoading(false)
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
              Online &bull; Ask anything about this lesson
            </span>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
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
                className="text-left px-3 py-1.5 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-50 text-stone-700 transition"
              >
                &bull; Give 3 practical sentence examples
              </button>
              <button
                type="button"
                onClick={() => handleSend(undefined, "Quiz me on this lesson with one question!")}
                className="text-left px-3 py-1.5 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-50 text-stone-700 transition"
              >
                &bull; Quiz me on this lesson with 1 question
              </button>
              <button
                type="button"
                onClick={() => handleSend(undefined, "Explain the core concept in simple Hinglish.")}
                className="text-left px-3 py-1.5 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-50 text-stone-700 transition"
              >
                &bull; Explain in simple Hinglish
              </button>
            </div>
          </div>
        ) : (
          messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "model" && (
                <div className="w-5 h-5 rounded-md bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  AI
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-emerald-800 text-white rounded-tr-xs"
                    : "bg-stone-100 text-stone-800 rounded-tl-xs border border-stone-200"
                }`}
              >
                {m.content}
              </div>
              {m.role === "user" && (
                <div className="w-5 h-5 rounded-md bg-stone-300 text-stone-700 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                  <User className="w-3 h-3" />
                </div>
              )}
            </div>
          ))
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

        <div ref={messagesEndRef} />
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
          className="px-3 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-40 text-white rounded-xl transition flex items-center justify-center cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  )
}

