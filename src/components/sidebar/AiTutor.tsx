import React, { useState, useEffect, useRef } from "react"
import {
  Send,
  Bot,
  User,
  Sparkles,
  AlertCircle,
  Loader2,
  Pencil,
  Trash2,
  Check,
  X,
  RotateCcw,
  Menu,
  ChevronDown,
  BookOpen,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Radio,
} from "lucide-react"
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
import {
  speakText,
  stopSpeaking,
  pauseSpeaking,
  resumeSpeaking,
  isSpeaking,
  isSpeechSynthesisSupported,
  isMediaRecorderSupported,
  isSpeechRecognitionSupported,
  AudioRecorder,
  LiveSpeechRecognizer,
} from "../../lib/voice"
import ReactionBar from "../common/ReactionBar"

interface Message {
  id?: number
  role: "user" | "model"
  content: string
  created_at?: string
  isVoice?: boolean
  audioUrl?: string
}

interface AiTutorProps {
  lesson: Lesson
}

interface PromptOption {
  icon: string
  title: string
  description: string
  promptText: string
  actionType: "send" | "input"
}

const QUICK_PROMPTS: PromptOption[] = [
  {
    icon: "✍️",
    title: "Correct sentence",
    description: "Paste your sentence to check grammar and natural phrasing",
    promptText: "Check my sentence: ",
    actionType: "input",
  },
  {
    icon: "💡",
    title: "Simpler Hinglish",
    description: "Explain this lesson's key concepts with fresh everyday analogies",
    promptText: "Can you explain this lesson in simpler Hinglish with a fresh analogy?",
    actionType: "send",
  },
  {
    icon: "🗣️",
    title: "Real-life examples",
    description: "2 natural sentences used in Indian workplace or daily life",
    promptText: "Give me 2 natural everyday sentences using these words in Indian workplace or daily life.",
    actionType: "send",
  },
  {
    icon: "🎯",
    title: "Quiz me",
    description: "Test your comprehension with 1 fill-in-the-blank question",
    promptText: "Ask me 1 quick fill-in-the-blank question to test my understanding of this lesson.",
    actionType: "send",
  },
  {
    icon: "📖",
    title: "Key Vocabulary",
    description: "Meanings and usage of difficult words in this lesson",
    promptText: "Explain the key vocabulary, phrasal verbs, and idioms from this lesson with easy Hindi meanings and examples.",
    actionType: "send",
  },
  {
    icon: "💬",
    title: "Practice Dialogue",
    description: "Start a short conversational roleplay with Akib Sir",
    promptText: "Let's do a 5-turn conversational roleplay using phrases from this lesson. You start first!",
    actionType: "send",
  },
]

function buildSystemPrompt(lesson: Lesson, userName: string): string {
  const typeLabel = lesson.lesson_type === 1 ? "Topic" : "Daily Class"
  const lessonSummary = lesson.content
    ? lesson.content.replace(/<[^>]*>/g, "").slice(0, 1500)
    : lesson.introduction || "No lesson text provided"

  return `You are a warm, highly encouraging, and patient personal English Tutor named 'Akib Sir' on the 'Learn English' web app.
You specialize in helping Hindi-speaking students become fluent and confident in everyday, spoken, and professional English.

CURRENT ${typeLabel.toUpperCase()} CONTEXT:
- Title: "${lesson.title}"
- Type: ${typeLabel}
- Date: ${lesson.lesson_date}
- Content / Key Concepts:
${lessonSummary}

STUDENT PROFILE:
- Name: ${userName}
- The student is learning English and prefers simple, natural conversational Hinglish (Hindi written in Roman English script + clear English sentences).

TEACHING & RESPONSE GUIDELINES:
1. Explanations:
   - Keep explanations clear, friendly, and relatable.
   - Mix conversational Hinglish with English (e.g., "Jab aap kisi cheez ki value pehle se maan lete hain...").
   - Use short bullet points and bold formatting for key English vocabulary.
2. Sentence Correction ("Correct me if I'm wrong"):
   - If the student writes a sentence and asks for feedback or tries to practice:
     a. Acknowledge what was good (positive reinforcement).
     b. Gently point out any grammatical or collocation errors.
     c. Provide the natural, native alternative in bold.
     d. Explain the 'why' in simple Hinglish so they remember the concept.
3. Practice Encouragement:
   - Keep answers concise (under 130-180 words) so the student isn't overwhelmed.
   - End with a quick follow-up question or micro-challenge asking them to make a sentence using one of the words.
4. Voice & Spoken English Assistance:
   - If the student asks by voice or shares spoken practice:
     a. Greet them warmly and encourage their spoken effort.
     b. Give specific encouraging feedback on their spoken phrasing, word choice, and pronunciation tips.
     c. Write in smooth, spoken-friendly Hinglish and English (natural pauses, conversational sentences) because your response will be read aloud to them in audio!`
}

export default function AiTutor({ lesson }: AiTutorProps) {
  const { currentUser } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isInitialMount = useRef(true)

  // Voice model state
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [liveTranscript, setLiveTranscript] = useState("")
  const [recordingError, setRecordingError] = useState<string | null>(null)
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState<number | null>(null)
  const [speechRate, setSpeechRate] = useState<number>(1.0)

  const recorderRef = useRef<AudioRecorder | null>(null)
  const recognizerRef = useRef<LiveSpeechRecognizer | null>(null)
  const timerRef = useRef<any>(null)
  const stopSpeakingRef = useRef<(() => void) | null>(null)

  // Editing state
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editInput, setEditInput] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  // Prompts menu / hamburger state
  const [showPromptsMenu, setShowPromptsMenu] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ""

  // Cleanup voice & recording on unmount
  useEffect(() => {
    return () => {
      stopSpeaking()
      if (timerRef.current) clearInterval(timerRef.current)
      recorderRef.current?.cancel()
      recognizerRef.current?.cancel()
    }
  }, [])

  useEffect(() => {
    async function loadHistory() {
      if (currentUser?.id) {
        const history = await fetchLessonChatMessages(lesson.id, currentUser.id)
        if (history && history.length > 0) {
          setMessages(
            history.map((m) => {
              const isVoice = m.content.startsWith("🎙️ [Voice Question]")
              const cleanContent = isVoice
                ? m.content.replace(/^🎙️ \[Voice Question\]\s*/, "")
                : m.content
              return {
                id: m.id,
                role: m.role === "assistant" || m.role === "model" ? "model" : "user",
                content: cleanContent,
                created_at: m.created_at,
                isVoice,
              }
            })
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

  // Speak model reply with sentence chunking
  const speakModelReply = async (text: string, msgIdx: number, rate = speechRate) => {
    stopSpeakingRef.current?.()
    setSpeakingMsgIdx(msgIdx)

    try {
      const cancel = await speakText(text, {
        rate,
        onStart: () => setSpeakingMsgIdx(msgIdx),
        onEnd: () => setSpeakingMsgIdx(null),
        onError: () => setSpeakingMsgIdx(null),
      })
      stopSpeakingRef.current = cancel
    } catch (err) {
      console.warn("Speech error:", err)
      setSpeakingMsgIdx(null)
    }
  }

  const handleStopSpeaking = () => {
    stopSpeakingRef.current?.()
    stopSpeaking()
    setSpeakingMsgIdx(null)
  }

  const handleCycleSpeed = (idx: number, content: string) => {
    const speeds = [1.0, 0.85, 1.15]
    const nextIdx = (speeds.indexOf(speechRate) + 1) % speeds.length
    const nextSpeed = speeds[nextIdx]
    setSpeechRate(nextSpeed)
    if (speakingMsgIdx === idx) {
      speakModelReply(content, idx, nextSpeed)
    }
  }

  // Recording controls
  const handleStartRecording = async () => {
    stopSpeakingRef.current?.()
    stopSpeaking()
    setSpeakingMsgIdx(null)
    setRecordingError(null)
    setLiveTranscript("")
    setRecordingSeconds(0)

    try {
      const recorder = new AudioRecorder()
      await recorder.start()
      recorderRef.current = recorder
      setIsRecording(true)

      // 60-second safety timer
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            handleFinishRecordingAndSend()
            return prev
          }
          return prev + 1
        })
      }, 1000)

      if (isSpeechRecognitionSupported()) {
        const recognizer = new LiveSpeechRecognizer()
        recognizer.start({
          onInterimResult: (text) => setLiveTranscript(text),
          onFinalResult: (text) => setLiveTranscript(text),
        })
        recognizerRef.current = recognizer
      }
    } catch (err: any) {
      console.error("Recording start error:", err)
      setRecordingError(err.message || "Microphone access failed. Please allow microphone permissions.")
      setIsRecording(false)
    }
  }

  const handleCancelRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    recorderRef.current?.cancel()
    recognizerRef.current?.cancel()
    recorderRef.current = null
    recognizerRef.current = null
    setIsRecording(false)
    setLiveTranscript("")
    setRecordingSeconds(0)
  }

  const handleFinishRecordingAndSend = async () => {
    if (!recorderRef.current) return
    if (timerRef.current) clearInterval(timerRef.current)

    setIsRecording(false)
    const finalTranscript = recognizerRef.current?.stop() || liveTranscript.trim()
    recognizerRef.current = null

    try {
      const audioResult = await recorderRef.current.stop()
      recorderRef.current = null

      const questionText = finalTranscript || "Voice Question"
      await handleSend(undefined, questionText, {
        isVoice: true,
        audioUrl: audioResult.url,
        audioData: {
          base64: audioResult.base64,
          mimeType: audioResult.mimeType,
        },
      })
    } catch (err: any) {
      console.error("Recording stop error:", err)
      setRecordingError("Could not process voice recording. Please try again.")
    } finally {
      setLiveTranscript("")
      setRecordingSeconds(0)
    }
  }

  const handleSend = async (
    e?: React.FormEvent,
    customPrompt?: string,
    voiceMeta?: { isVoice: boolean; audioUrl?: string; audioData?: { base64: string; mimeType: string } }
  ) => {
    if (e) e.preventDefault()
    const textToSend = customPrompt || input.trim()
    if (!textToSend && !voiceMeta?.audioData) return
    if (isLoading) return

    stopSpeakingRef.current?.()
    stopSpeaking()
    setSpeakingMsgIdx(null)

    setInput("")
    setError(null)

    const isVoiceMsg = !!voiceMeta?.isVoice
    const userMsg: Message = {
      role: "user",
      content: textToSend || "🎙️ Voice Question",
      isVoice: isVoiceMsg,
      audioUrl: voiceMeta?.audioUrl,
    }

    // Save user message to database if logged in
    let userDbId: number | undefined
    if (currentUser?.id) {
      try {
        const saved = await saveLessonChatMessage(
          lesson.id,
          currentUser.id,
          "user",
          isVoiceMsg ? `🎙️ [Voice Question] ${textToSend}` : textToSend
        )
        userDbId = saved.id
        userMsg.id = userDbId
      } catch (err) {
        console.error("Failed to save user chat message:", err)
      }
    }

    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setIsLoading(true)

    try {
      if (!apiKey) {
        await new Promise((r) => setTimeout(r, 800))
        const demoReply = `Namaste ${currentUser?.name || "Student"}! 🙏 Main aapka **AI English Tutor** Akib Sir hoon.\n\nAapka ${
          isVoiceMsg ? "voice" : ""
        } question tha: *"${(textToSend || "Voice recording").slice(0, 80)}..."*\n\nLive Google Gemini AI explanations activate karne ke liye please apna free **VITE_GEMINI_API_KEY** configure karein!\n\n**Tip for "${
          lesson.title
        }":** Is context ke concepts se ek sentence banayein aur daily practice karein!`

        const newMessages = [...updatedMessages, { role: "model" as const, content: demoReply }]
        setMessages(newMessages)
        setIsLoading(false)

        if (voiceEnabled || isVoiceMsg) {
          speakModelReply(demoReply, newMessages.length - 1)
        }
        return
      }

      const systemInstruction = buildSystemPrompt(lesson, currentUser?.name || "Student")

      const { reply } = await sendGeminiChatMessage({
        apiKey,
        messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        userMessage: textToSend,
        systemInstruction,
        audioData: voiceMeta?.audioData,
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

      const newMessages = [...updatedMessages, { id: modelDbId, role: "model" as const, content: reply }]
      setMessages(newMessages)

      // Auto-speak model answer if voice model is ON or question was asked via voice
      if (voiceEnabled || isVoiceMsg) {
        speakModelReply(reply, newMessages.length - 1)
      }
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
        setIsLoading(true)
        setError(null)
        try {
          const systemInstruction = buildSystemPrompt(lesson, currentUser?.name || "Student")

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

          const freshList = [...nextMessages, { id: modelDbId, role: "model" as const, content: reply }]
          setMessages(freshList)

          if (voiceEnabled) {
            speakModelReply(reply, freshList.length - 1)
          }
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
      if (speakingMsgIdx === idx) handleStopSpeaking()
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
      handleStopSpeaking()
      setMessages([])
      cancelEdit()
    } catch (err: any) {
      alert(err?.message || "Failed to clear chat history.")
    }
  }

  const handleSelectPrompt = (opt: PromptOption) => {
    setShowPromptsMenu(false)
    if (opt.actionType === "input") {
      setInput(opt.promptText)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 60)
    } else {
      handleSend(undefined, opt.promptText)
    }
  }

  return (
    <div className="flex flex-col h-[480px] lg:h-[520px]">
      {/* Header bar: Brand on Left, Voice Toggle, Prompts & Reset on Right */}
      <div className="p-2.5 sm:p-3 bg-emerald-900/5 border-b border-emerald-900/10 flex items-center justify-between gap-2">
        {/* Left Side: Ask Akib Sir Brand */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
            ✨
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-stone-900 block leading-tight truncate">
              Ask Akib Sir
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              Hinglish AI Tutor
            </span>
          </div>
        </div>

        {/* Right Side: Voice Answer Toggle, Prompts & Reset */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Voice Model Toggle */}
          <button
            type="button"
            onClick={() => {
              if (speakingMsgIdx !== null) handleStopSpeaking()
              setVoiceEnabled(!voiceEnabled)
            }}
            className={`px-2 py-1.5 rounded-xl border transition flex items-center gap-1 cursor-pointer shrink-0 text-[11px] font-bold ${
              voiceEnabled
                ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
                : "bg-white text-stone-400 border-stone-200 hover:text-stone-700 shadow-2xs"
            }`}
            title={
              voiceEnabled
                ? "Voice Model ON (Akib Sir speaks answers in audio). Click to mute auto-speak."
                : "Voice Model OFF (Click to enable audio answers)."
            }
          >
            {voiceEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-stone-400" />
            )}
            <span className="hidden sm:inline">{voiceEnabled ? "Voice ON" : "Voice OFF"}</span>
          </button>

          {/* Prompts Drawer Button */}
          <button
            type="button"
            onClick={() => setShowPromptsMenu(!showPromptsMenu)}
            className={`px-2.5 py-1.5 rounded-xl border transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              showPromptsMenu
                ? "bg-emerald-800 text-white border-emerald-800 shadow-2xs"
                : "bg-white text-stone-700 border-stone-200 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 shadow-2xs"
            }`}
            title={showPromptsMenu ? "Close Prompts" : "Open Quick Prompts"}
            aria-label="Toggle Quick Prompts"
          >
            {showPromptsMenu ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
            <span className="text-[11px] font-bold">Prompts</span>
          </button>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              className="text-[11px] text-stone-400 hover:text-red-600 transition flex items-center gap-1 px-2 py-1 rounded-md hover:bg-stone-100 cursor-pointer"
              title="Clear conversation"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Hamburger Dropdown / Prompts Drawer (Opened via Prompts Button) */}
      {showPromptsMenu && (
        <div className="p-3 bg-stone-50 border-b border-stone-200 space-y-2 animate-in slide-in-from-top-2 duration-150 z-20">
          <div className="flex items-center justify-between text-xs font-bold text-stone-800">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              <span>Choose a Practice Prompt</span>
            </div>
            <button
              type="button"
              onClick={() => setShowPromptsMenu(false)}
              className="text-stone-400 hover:text-stone-700 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {QUICK_PROMPTS.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectPrompt(opt)}
                className="text-left p-2.5 bg-white border border-stone-200 hover:border-emerald-600/60 hover:bg-emerald-50/60 rounded-xl transition cursor-pointer shadow-2xs group flex items-start gap-2"
              >
                <span className="text-base shrink-0 leading-none mt-0.5">{opt.icon}</span>
                <div className="min-w-0">
                  <span className="font-bold text-stone-900 group-hover:text-emerald-800 block text-xs leading-snug">
                    {opt.title}
                  </span>
                  <span className="text-[10px] text-stone-500 block leading-tight mt-0.5">
                    {opt.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
        {messages.length === 0 ? (
          <div className="py-8 text-center text-stone-400 space-y-2.5">
            <div className="text-3xl">🎙️</div>
            <p className="text-xs sm:text-sm font-semibold text-stone-700">
              Koi doubt hai ya English practice karni hai?
            </p>
            <p className="text-[11px] text-stone-500 max-w-sm mx-auto leading-relaxed">
              Mic dabakar apna question bolein ya type karein. Akib Sir Hinglish mein explain aur audio mein answer karenge!
            </p>
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
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold shadow-2xs">
                    AS
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
                      {/* Voice Question Badge */}
                      {isUser && m.isVoice && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-200 mb-1 border-b border-emerald-700/60 pb-1">
                          <Mic className="w-3 h-3 text-emerald-300" />
                          <span>Voice Question</span>
                        </div>
                      )}

                      <div>{m.content}</div>

                      {/* Student's recorded audio playback */}
                      {isUser && m.audioUrl && (
                        <div className="mt-1.5 pt-1.5 border-t border-emerald-700/60">
                          <audio controls src={m.audioUrl} className="h-6 w-44 max-w-full opacity-90 rounded" />
                        </div>
                      )}
                    </div>

                    {/* Akib Sir Audio Player Bar */}
                    {!isUser && (
                      <div className="flex flex-wrap items-center gap-1.5 px-1 pt-0.5">
                        {speakingMsgIdx === idx ? (
                          <button
                            type="button"
                            onClick={handleStopSpeaking}
                            className="px-2 py-0.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                            title="Stop audio playback"
                          >
                            <Square className="w-2.5 h-2.5 fill-current" />
                            <span>Stop Audio</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => speakModelReply(m.content, idx)}
                            className="px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                            title="Listen to Akib Sir answer in audio"
                          >
                            <Volume2 className="w-3 h-3 text-emerald-700" />
                            <span>Listen to Audio</span>
                          </button>
                        )}

                        {/* Speaking equalizer animation */}
                        {speakingMsgIdx === idx && (
                          <div className="flex items-center gap-1 text-[10px] text-emerald-800 font-semibold bg-emerald-100/70 px-2 py-0.5 rounded-full">
                            <span className="flex items-end gap-0.5 h-2.5">
                              <span className="w-0.5 h-1.5 bg-emerald-600 rounded-full animate-pulse"></span>
                              <span className="w-0.5 h-2.5 bg-emerald-600 rounded-full animate-pulse delay-75"></span>
                              <span className="w-0.5 h-2 bg-emerald-600 rounded-full animate-pulse delay-150"></span>
                            </span>
                            <span>Akib Sir speaking...</span>
                          </div>
                        )}

                        {/* Audio Speed Selector */}
                        <button
                          type="button"
                          onClick={() => handleCycleSpeed(idx, m.content)}
                          className="px-1.5 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-600 text-[10px] font-mono font-bold transition cursor-pointer"
                          title="Toggle speaking speed: 1.0x (normal), 0.85x (slow for learners), 1.15x (fast)"
                        >
                          {speechRate}x
                        </button>
                      </div>
                    )}

                    {/* Reactions & Action buttons */}
                    <div
                      className={`flex flex-wrap items-center gap-1.5 px-1 ${
                        isUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      <ReactionBar
                        entityType="ai_chat"
                        entityId={m.id ? `id_${m.id}` : `idx_${idx}_${lesson.id}`}
                        ownerId={currentUser?.id}
                        contentPreview={m.content}
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
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-medium animate-pulse py-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-600"></span>
            <span>Akib Sir is thinking and preparing your audio response...</span>
          </div>
        )}

        {recordingError && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-[11px] flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{recordingError}</span>
            </div>
            <button
              type="button"
              onClick={() => setRecordingError(null)}
              className="text-amber-700 hover:text-amber-900 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {error && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-[11px] flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Input / Voice Recording Area */}
      {isRecording ? (
        <div className="p-2.5 sm:p-3 border-t border-emerald-200 bg-emerald-50/70 space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
              </span>
              <span className="text-xs font-bold text-stone-800">
                Recording Question...
              </span>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-white border border-stone-200 text-stone-600">
                {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, "0")} / 1:00
              </span>
            </div>

            {/* Equalizer animation */}
            <div className="flex items-end gap-0.5 h-3.5">
              <div className="w-1 bg-red-500 rounded-full animate-pulse h-2"></div>
              <div className="w-1 bg-red-500 rounded-full animate-pulse delay-75 h-3.5"></div>
              <div className="w-1 bg-red-500 rounded-full animate-pulse delay-150 h-2.5"></div>
              <div className="w-1 bg-red-500 rounded-full animate-pulse delay-200 h-3"></div>
              <div className="w-1 bg-red-500 rounded-full animate-pulse h-1.5"></div>
            </div>
          </div>

          {/* Live speech preview */}
          <div className="p-2 bg-white rounded-xl border border-emerald-200/80 text-xs text-stone-700 min-h-[36px] flex items-center">
            {liveTranscript ? (
              <span className="text-stone-900 font-medium">{liveTranscript}</span>
            ) : (
              <span className="text-stone-400 italic flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                Speak into your mic (English / Hinglish)...
              </span>
            )}
          </div>

          {/* Recording actions */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleCancelRecording}
              className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-600 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
            >
              <X className="w-3.5 h-3.5 text-stone-400" />
              <span>Cancel</span>
            </button>

            <button
              type="button"
              onClick={handleFinishRecordingAndSend}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Voice Question</span>
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => handleSend(e)} className="p-2 border-t border-stone-200 bg-white flex items-center gap-1.5">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type question or tap mic to speak..."
            className="flex-1 px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
          />

          {/* Record Voice Button */}
          <button
            type="button"
            onClick={handleStartRecording}
            disabled={isLoading}
            className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl transition flex items-center justify-center cursor-pointer shrink-0 shadow-2xs disabled:opacity-40"
            title="Ask by Voice (Record your question)"
          >
            <Mic className="w-4 h-4 text-emerald-800" />
          </button>

          {/* Send text button */}
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-40 text-white rounded-xl transition flex items-center justify-center cursor-pointer shadow-xs shrink-0"
            title="Send question"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  )
}
