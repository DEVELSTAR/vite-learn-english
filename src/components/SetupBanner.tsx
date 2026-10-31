import React from "react"
import { isSupabaseConfigured } from "../lib/supabase"
import { Database, AlertCircle } from "lucide-react"

export default function SetupBanner() {
  if (isSupabaseConfigured) return null

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-900 px-4 py-2.5 text-xs">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Running in Offline / Mock Mode:</strong> Configure <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your <code>.env</code> or Vercel Environment Variables to connect to live PostgreSQL.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
            <Database className="w-3.5 h-3.5" />
            <span>Schema Ready</span>
          </span>
        </div>
      </div>
    </div>
  )
}
