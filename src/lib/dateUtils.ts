// IST (Indian Standard Time, UTC+05:30) Date and Time Utilities

export function parseDate(isoString?: string): Date {
  if (!isoString) return new Date()
  let str = isoString.trim()

  // If timestamp lacks timezone offset (e.g. '2026-11-02T04:40:39.972' or '2026-11-02 04:40:39'),
  // PostgreSQL / Supabase stores in UTC. We must append 'Z' so JS parses it in UTC,
  // preventing browsers in IST from subtracting an extra 5.5 hours.
  if (!str.endsWith("Z") && !/[+-]\d{2}(:\d{2})?$/.test(str)) {
    // Replace space with T if needed
    str = str.replace(" ", "T") + "Z"
  }

  const d = new Date(str)
  return isNaN(d.getTime()) ? new Date() : d
}

export function formatISTDateTime(isoString?: string): string {
  if (!isoString) return ""
  const date = parseDate(isoString)
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

export function formatISTDate(isoString?: string): string {
  if (!isoString) return ""
  const date = parseDate(isoString)
  return date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function formatTimeAgo(isoString?: string): string {
  if (!isoString) return ""
  const date = parseDate(isoString)
  const now = new Date()
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffSec < 45) return "just now"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })
}

