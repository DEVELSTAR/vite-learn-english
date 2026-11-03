import { GoogleGenerativeAI } from "@google/generative-ai"

// Model candidates in priority order (verified against Google Generative Language v1 API)
const DEFAULT_CANDIDATES = [
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
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
  audioData?: {
    base64: string
    mimeType: string
  }
}

export async function sendGeminiChatMessage(options: SendMessageOptions): Promise<{ reply: string; usedModel: string }> {
  const { apiKey, messages, userMessage, systemInstruction, audioData } = options

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

  // Try each candidate with the stable 'v1' endpoint
  for (const modelName of candidates) {
    try {
      const model = genAI.getGenerativeModel(
        {
          model: modelName,
          ...(systemInstruction ? { systemInstruction } : {}),
        },
        { apiVersion: "v1" }
      )

      const historyFormatted = messages.map((m) => ({
        role: m.role === "model" ? "model" : "user",
        parts: [{ text: m.content }],
      }))

      const chat = model.startChat({
        history: historyFormatted,
      })

      let result: any
      if (audioData?.base64) {
        const parts: any[] = [
          {
            inlineData: {
              mimeType: audioData.mimeType || "audio/webm",
              data: audioData.base64,
            },
          },
        ]
        if (userMessage) {
          parts.push({ text: userMessage })
        } else {
          parts.push({
            text: "Please listen to my audio question and answer as Akib Sir in natural, encouraging Hinglish and English.",
          })
        }
        result = await chat.sendMessage(parts)
      } else {
        result = await chat.sendMessage(userMessage)
      }
      const reply = result.response.text()

      if (reply) {
        cachedWorkingModel = modelName
        return { reply, usedModel: modelName }
      }
    } catch (err: any) {
      lastError = err
      const errMsg = String(err?.message || err)

      // If model not found, no longer available, or temporary 503 high demand, try next model
      if (
        errMsg.includes("404") ||
        errMsg.includes("503") ||
        errMsg.includes("high demand") ||
        errMsg.includes("no longer available") ||
        errMsg.includes("not found") ||
        errMsg.includes("not supported") ||
        errMsg.includes("ListModels")
      ) {
        console.warn(`[Gemini] Model "${modelName}" failed with: ${errMsg}. Trying fallback candidate...`)
        continue
      }

      // If systemInstruction is not supported on this model, retry without it
      if (errMsg.toLowerCase().includes("system instruction") || errMsg.toLowerCase().includes("system_instruction")) {
        try {
          const fallbackModel = genAI.getGenerativeModel({ model: modelName }, { apiVersion: "v1" })
          const fallbackParts: any[] = []
          if (audioData?.base64) {
            fallbackParts.push({
              inlineData: {
                mimeType: audioData.mimeType || "audio/webm",
                data: audioData.base64,
              },
            })
          }
          const promptText = systemInstruction
            ? `[System Instructions: ${systemInstruction}]\n\n${userMessage || "Please answer my voice question."}`
            : userMessage || "Please answer my voice question."
          fallbackParts.push({ text: promptText })

          const result = await fallbackModel.generateContent(fallbackParts)
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

      // If it is another hard error (e.g. invalid key, quota limit), rethrow
      throw err
    }
  }

  throw lastError || new Error("Unable to get response from Gemini AI. Please check your model configuration.")
}
