import { GoogleGenerativeAI } from "@google/generative-ai"

// Model candidates in priority order
const DEFAULT_CANDIDATES = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro-latest",
  "gemini-pro",
]

let cachedWorkingModel: string | null = null

export interface ChatMessage {
  role: "user" | "model"
  content: string
}

export interface SendMessageOptions {
  apiKey: string
  messages: ChatMessage[]
  userMessage: string
  systemInstruction?: string
}

export async function sendGeminiChatMessage(options: SendMessageOptions): Promise<{ reply: string; usedModel: string }> {
  const { apiKey, messages, userMessage, systemInstruction } = options

  if (!apiKey) {
    throw new Error("Missing Gemini API Key. Please configure VITE_GEMINI_API_KEY in your .env file.")
  }

  const genAI = new GoogleGenerativeAI(apiKey)

  // Determine candidate list: user-specified model first, cached working model, then defaults
  const userSpecifiedModel = (import.meta.env.VITE_GEMINI_MODEL || "").trim()

  const candidates: string[] = []
  if (userSpecifiedModel) candidates.push(userSpecifiedModel)
  if (cachedWorkingModel && !candidates.includes(cachedWorkingModel)) candidates.push(cachedWorkingModel)
  for (const m of DEFAULT_CANDIDATES) {
    if (!candidates.includes(m)) candidates.push(m)
  }

  let lastError: any = null

  for (const modelName of candidates) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        ...(systemInstruction ? { systemInstruction } : {}),
      })

      const historyFormatted = messages.map((m) => ({
        role: m.role === "model" ? "model" : "user",
        parts: [{ text: m.content }],
      }))

      const chat = model.startChat({
        history: historyFormatted,
      })

      const result = await chat.sendMessage(userMessage)
      const reply = result.response.text()

      if (reply) {
        cachedWorkingModel = modelName
        return { reply, usedModel: modelName }
      }
    } catch (err: any) {
      lastError = err
      const errMsg = String(err?.message || err)

      // If model not found or not supported for generateContent (404), continue to next model
      if (
        errMsg.includes("404") ||
        errMsg.includes("not found") ||
        errMsg.includes("not supported") ||
        errMsg.includes("ListModels")
      ) {
        console.warn(`[Gemini] Model "${modelName}" not available (${errMsg}), trying fallback...`)
        continue
      }

      // If systemInstruction is not supported on this model, retry without it
      if (errMsg.toLowerCase().includes("system instruction") || errMsg.toLowerCase().includes("system_instruction")) {
        try {
          const fallbackModel = genAI.getGenerativeModel({ model: modelName })
          const augmentedPrompt = systemInstruction
            ? `[System Instructions: ${systemInstruction}]\n\n${userMessage}`
            : userMessage
          const result = await fallbackModel.generateContent(augmentedPrompt)
          const reply = result.response.text()
          if (reply) {
            cachedWorkingModel = modelName
            return { reply, usedModel: modelName }
          }
        } catch (innerErr) {
          lastError = innerErr
          continue
        }
      }

      // If it is another error (e.g. invalid key, quota limit), don't silently loop - rethrow
      throw err
    }
  }

  throw lastError || new Error("Unable to get response from Gemini AI. Please check your model configuration.")
}

