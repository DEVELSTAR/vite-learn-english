/**
 * Voice & Audio utilities for Learn English AI Tutor (Ask Akib Sir).
 * Provides:
 * 1. Speech Synthesis (Text-to-Speech) with natural Hinglish/English voice selection,
 *    markdown text cleaner, and long-sentence chunking to prevent browser 15s cutoff.
 * 2. Audio Recording (MediaRecorder) for microphone capture.
 * 3. Speech Recognition (Web Speech API) for real-time live transcription.
 */

// -------------------------------------------------------------
// Type declarations for browser SpeechRecognition
// -------------------------------------------------------------
interface IWindowWithSpeech extends Window {
  SpeechRecognition?: any
  webkitSpeechRecognition?: any
}

// -------------------------------------------------------------
// 1. Text Cleaner for Natural Speech
// -------------------------------------------------------------
/**
 * Strips markdown, emojis, asterisks, URLs, and formatting so the speech
 * synthesis engine pronounces natural sentences without reading punctuation aloud.
 */
export function cleanTextForSpeech(raw: string): string {
  if (!raw) return ""

  let text = raw
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, " ")
    // Remove inline code
    .replace(/`([^`]+)`/g, "$1")
    // Remove image and link markdown: [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove headers (# Heading)
    .replace(/#{1,6}\s+/g, "")
    // Remove bold/italics: **text** or *text* -> text
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    // Remove bullet points / lists
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    // Remove blockquotes
    .replace(/^\s*>\s+/gm, "")
    // Remove HTML tags
    .replace(/<[^>]+>/g, " ")
    // Remove typical emojis
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
    // Clean up excessive whitespace and punctuation
    .replace(/\s+/g, " ")
    .trim()

  return text
}

/**
 * Splits long text into natural sentence-level chunks so that
 * browser SpeechSynthesis never times out or drops audio mid-paragraph.
 */
export function chunkTextIntoSentences(text: string): string[] {
  if (!text) return []
  // Split on sentence terminators while preserving them
  const rawSentences = text.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [text]
  const chunks: string[] = []

  let currentChunk = ""
  for (const s of rawSentences) {
    const trimmed = s.trim()
    if (!trimmed) continue

    if ((currentChunk + " " + trimmed).length < 160) {
      currentChunk = currentChunk ? currentChunk + " " + trimmed : trimmed
    } else {
      if (currentChunk) chunks.push(currentChunk)
      currentChunk = trimmed
    }
  }
  if (currentChunk) chunks.push(currentChunk)

  return chunks.length > 0 ? chunks : [text]
}

// -------------------------------------------------------------
// 2. Speech Synthesis (Text to Speech)
// -------------------------------------------------------------

export interface SpeakOptions {
  rate?: number // 0.85 = slow learner, 1.0 = normal, 1.2 = fast
  pitch?: number // default 1.0
  voiceName?: string
  onStart?: () => void
  onEnd?: () => void
  onError?: (err: any) => void
  onChunkChange?: (index: number, total: number) => void
}

let activeUtteranceChunkIndex = 0
let activeChunks: string[] = []
let activeSpeechCancelled = false

/**
 * Checks if browser supports SpeechSynthesis
 */
export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window
}

/**
 * Retrieves available speech synthesis voices, preferring Indian English or natural English.
 */
export function getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!isSpeechSynthesisSupported()) {
      resolve([])
      return
    }

    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      resolve(sortVoicesForLearner(voices))
      return
    }

    // Chrome loads voices asynchronously
    const onVoicesChanged = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged)
      resolve(sortVoicesForLearner(window.speechSynthesis.getVoices()))
    }
    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged)

    // Fallback timeout
    setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged)
      resolve(sortVoicesForLearner(window.speechSynthesis.getVoices()))
    }, 500)
  })
}

function sortVoicesForLearner(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  // Sort priority: en-IN (Indian English) > hi-IN > en-GB > en-US > other English > others
  return [...voices].sort((a, b) => {
    const score = (v: SpeechSynthesisVoice) => {
      const lang = v.lang.toLowerCase()
      const name = v.name.toLowerCase()
      if (lang === "en-in" || name.includes("india") || name.includes("indian")) return 100
      if (lang === "hi-in" || name.includes("hindi")) return 80
      if (lang === "en-gb" || name.includes("uk")) return 60
      if (lang === "en-us" || name.includes("us")) return 50
      if (lang.startsWith("en")) return 40
      return 10
    }
    return score(b) - score(a)
  })
}

/**
 * Speaks text using the browser's SpeechSynthesis engine.
 * Splits into sentence chunks to bypass the 15-second Chrome freeze bug.
 * Returns a cancel function.
 */
export async function speakText(rawText: string, options: SpeakOptions = {}): Promise<() => void> {
  const cancel = () => {
    activeSpeechCancelled = true
    if (isSpeechSynthesisSupported()) {
      try {
        window.speechSynthesis.cancel()
      } catch {
        // ignore
      }
    }
  }

  if (!isSpeechSynthesisSupported()) {
    console.warn("SpeechSynthesis not supported on this browser.")
    options.onError?.(new Error("Audio playback is not supported on this device/browser."))
    return cancel
  }

  // Cancel any ongoing speech
  cancel()
  activeSpeechCancelled = false

  const cleaned = cleanTextForSpeech(rawText)
  if (!cleaned) {
    options.onEnd?.()
    return cancel
  }

  const chunks = chunkTextIntoSentences(cleaned)
  activeChunks = chunks
  activeUtteranceChunkIndex = 0

  const voices = await getAvailableVoices()
  // Choose voice: options.voiceName, or top-ranked voice
  const chosenVoice = options.voiceName
    ? voices.find((v) => v.name === options.voiceName) || voices[0]
    : voices[0]

  const rate = options.rate ?? 1.0
  const pitch = options.pitch ?? 1.0

  options.onStart?.()

  const speakNext = (index: number) => {
    if (activeSpeechCancelled || index >= chunks.length) {
      if (!activeSpeechCancelled) {
        options.onEnd?.()
      }
      return
    }

    activeUtteranceChunkIndex = index
    options.onChunkChange?.(index, chunks.length)

    const chunk = chunks[index]
    const utterance = new SpeechSynthesisUtterance(chunk)

    if (chosenVoice) utterance.voice = chosenVoice
    utterance.rate = rate
    utterance.pitch = pitch

    utterance.onend = () => {
      if (!activeSpeechCancelled) {
        speakNext(index + 1)
      }
    }

    utterance.onerror = (err) => {
      if (activeSpeechCancelled || err.error === "canceled" || err.error === "interrupted") {
        return
      }
      console.warn("SpeechSynthesis utterance error:", err)
      // Try next chunk even if one failed
      speakNext(index + 1)
    }

    try {
      window.speechSynthesis.speak(utterance)
    } catch (e) {
      options.onError?.(e)
    }
  }

  speakNext(0)
  return cancel
}

export function stopSpeaking() {
  activeSpeechCancelled = true
  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.cancel()
    } catch {
      // ignore
    }
  }
}

export function pauseSpeaking() {
  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.pause()
    } catch {
      // ignore
    }
  }
}

export function resumeSpeaking() {
  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.resume()
    } catch {
      // ignore
    }
  }
}

export function isSpeaking(): boolean {
  if (!isSpeechSynthesisSupported()) return false
  return window.speechSynthesis.speaking && !window.speechSynthesis.paused
}

// -------------------------------------------------------------
// 3. Audio Recorder (MediaRecorder for Microphone Capture)
// -------------------------------------------------------------

export interface RecordedAudioResult {
  blob: Blob
  url: string
  base64: string
  mimeType: string
  durationSec: number
}

export function isMediaRecorderSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined"
  )
}

/**
 * Manages audio recording from the user's microphone using MediaRecorder.
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null
  private startTime: number = 0

  async start(): Promise<void> {
    if (!isMediaRecorderSupported()) {
      throw new Error("Microphone recording is not supported on this browser.")
    }

    // Stop any existing tracks
    this.cleanup()

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        throw new Error("Microphone permission was denied. Please allow microphone access in your browser settings.")
      }
      throw new Error("Unable to access microphone: " + (err.message || "Unknown error"))
    }

    this.audioChunks = []
    this.startTime = Date.now()

    // Determine supported mimeType
    const mimeTypes = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
      "audio/wav",
    ]
    let chosenMime = ""
    for (const m of mimeTypes) {
      if (MediaRecorder.isTypeSupported(m)) {
        chosenMime = m
        break
      }
    }

    this.mediaRecorder = chosenMime
      ? new MediaRecorder(this.stream, { mimeType: chosenMime })
      : new MediaRecorder(this.stream)

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data)
      }
    }

    this.mediaRecorder.start(250) // collect chunks every 250ms
  }

  async stop(): Promise<RecordedAudioResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
        reject(new Error("Recording is not currently active."))
        return
      }

      const durationSec = Math.max(1, Math.round((Date.now() - this.startTime) / 1000))

      this.mediaRecorder.onstop = async () => {
        try {
          const mimeType = this.mediaRecorder?.mimeType || "audio/webm"
          const blob = new Blob(this.audioChunks, { type: mimeType })
          const url = URL.createObjectURL(blob)

          // Convert to base64
          const base64 = await blobToBase64(blob)

          this.cleanup()

          resolve({
            blob,
            url,
            base64,
            mimeType: mimeType.split(";")[0], // Clean mime type (e.g. 'audio/webm')
            durationSec,
          })
        } catch (err) {
          this.cleanup()
          reject(err)
        }
      }

      this.mediaRecorder.stop()
    })
  }

  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop()
      } catch {
        // ignore
      }
    }
    this.cleanup()
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch {
          // ignore
        }
      })
      this.stream = null
    }
    this.mediaRecorder = null
    this.audioChunks = []
  }
}

/**
 * Converts a Blob to base64 string (without the data: URL prefix).
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = reader.result as string
      // Extract everything after 'base64,'
      const base64 = dataUrl.split(",")[1] || ""
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// -------------------------------------------------------------
// 4. Live Speech Recognition (Web Speech API)
// -------------------------------------------------------------

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false
  const w = window as IWindowWithSpeech
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition)
}

export interface LiveRecognizerCallbacks {
  onInterimResult?: (transcript: string) => void
  onFinalResult?: (transcript: string) => void
  onError?: (err: any) => void
  onEnd?: () => void
}

/**
 * Manages live speech recognition for real-time transcription as the student speaks.
 */
export class LiveSpeechRecognizer {
  private recognition: any = null
  private isListening = false
  private accumulatedFinal = ""

  constructor() {
    if (isSpeechRecognitionSupported()) {
      const w = window as IWindowWithSpeech
      const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition
      this.recognition = new SpeechRec()
      this.recognition.continuous = true
      this.recognition.interimResults = true
      // en-IN allows English with Indian accent/Hinglish words
      this.recognition.lang = "en-IN"
    }
  }

  start(callbacks: LiveRecognizerCallbacks): void {
    if (!this.recognition) return

    this.accumulatedFinal = ""
    this.isListening = true

    this.recognition.onresult = (event: any) => {
      let interim = ""
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i]
        if (item.isFinal) {
          this.accumulatedFinal += (this.accumulatedFinal ? " " : "") + item[0].transcript
        } else {
          interim += item[0].transcript
        }
      }

      const combined = this.accumulatedFinal + (interim ? " " + interim : "")
      callbacks.onInterimResult?.(combined.trim())
      if (this.accumulatedFinal) {
        callbacks.onFinalResult?.(this.accumulatedFinal.trim())
      }
    }

    this.recognition.onerror = (event: any) => {
      // 'no-speech' or 'aborted' are non-fatal
      if (event.error !== "no-speech" && event.error !== "aborted") {
        callbacks.onError?.(event)
      }
    }

    this.recognition.onend = () => {
      if (this.isListening) {
        // Auto-restart if still flagged listening (prevents early cutoff)
        try {
          this.recognition.start()
        } catch {
          this.isListening = false
          callbacks.onEnd?.()
        }
      } else {
        callbacks.onEnd?.()
      }
    }

    try {
      this.recognition.start()
    } catch (e) {
      console.warn("Could not start SpeechRecognition:", e)
    }
  }

  stop(): string {
    this.isListening = false
    if (this.recognition) {
      try {
        this.recognition.stop()
      } catch {
        // ignore
      }
    }
    return this.accumulatedFinal.trim()
  }

  cancel(): void {
    this.isListening = false
    if (this.recognition) {
      try {
        this.recognition.abort()
      } catch {
        // ignore
      }
    }
    this.accumulatedFinal = ""
  }
}

