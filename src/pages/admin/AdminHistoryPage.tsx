import React, { useState, useEffect } from "react"
import {
  History,
  Search,
  Filter,
  User,
  Clock,
  ArrowUpDown,
  RefreshCw,
  Loader2,
  Shield,
  FileText,
  MessageCircle,
  BookOpen,
  KeyRound,
  Trash2,
  PlusCircle,
  Pencil,
  LogIn,
  UserPlus,
} from "lucide-react"
import { fetchActivityHistory, ActivityRecord } from "../../lib/activityHistory"
import { useAuth } from "../../context/AuthContext"
import { User as DbUser } from "../../types/database"

function formatTimeAgo(isoString?: string): string {
  if (!isoString) return ""
  const date = new Date(isoString)
  const now = new Date()
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diffSec < 60) return "just now"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export default function AdminHistoryPage() {
  const { fetchStudents } = useAuth()
  const [logs, setLogs] = useState<ActivityRecord[]>([])
  const [students, setStudents] = useState<DbUser[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [selectedStudentId, setSelectedStudentId] = useState<string>("all")
  const [selectedResourceType, setSelectedResourceType] = useState<string>("all")
  const [selectedAction, setSelectedAction] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const loadLogs = async () => {
    setIsLoading(true)
    try {
      const studentIdNum = selectedStudentId !== "all" ? parseInt(selectedStudentId, 10) : null
      const data = await fetchActivityHistory({
        userId: studentIdNum,
        resourceType: selectedResourceType !== "all" ? selectedResourceType : undefined,
        action: selectedAction !== "all" ? selectedAction : undefined,
        search: searchQuery.trim() || undefined,
      })
      setLogs(data)
    } catch (err) {
      console.error("Failed to load activity logs:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    async function loadMeta() {
      try {
        const studentList = await fetchStudents()
        setStudents(studentList)
      } catch (err) {
        console.error("Failed to load students list for filter:", err)
      }
    }
    loadMeta()
  }, [])

  useEffect(() => {
    loadLogs()
  }, [selectedStudentId, selectedResourceType, selectedAction, searchQuery])

  const getActionBadge = (action: string) => {
    switch (action) {
      case "signup":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <UserPlus className="w-3 h-3" />
            <span>Sign Up</span>
          </span>
        )
      case "login":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <LogIn className="w-3 h-3" />
            <span>Login</span>
          </span>
        )
      case "create":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <PlusCircle className="w-3 h-3" />
            <span>Create</span>
          </span>
        )
      case "update":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Pencil className="w-3 h-3" />
            <span>Update</span>
          </span>
        )
      case "destroy":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <Trash2 className="w-3 h-3" />
            <span>Destroy</span>
          </span>
        )
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700">
            {action}
          </span>
        )
    }
  }

  const getResourceIcon = (resource: string) => {
    switch (resource) {
      case "auth":
        return <KeyRound className="w-3.5 h-3.5 text-blue-500" />
      case "note":
        return <FileText className="w-3.5 h-3.5 text-amber-600" />
      case "comment":
        return <MessageCircle className="w-3.5 h-3.5 text-indigo-500" />
      case "lesson":
        return <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
      case "user":
        return <User className="w-3.5 h-3.5 text-purple-600" />
      default:
        return <Clock className="w-3.5 h-3.5 text-stone-400" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <span>Student & System Activity History</span>
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time audit log of student logins, registrations, and content actions (Create, Update, Destroy).
          </p>
        </div>

        <button
          type="button"
          onClick={loadLogs}
          className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto border border-stone-200"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm space-y-3.5">
        <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
          <Filter className="w-4 h-4 text-stone-500" />
          <span>Filter Activity Feed</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* 1. Student Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-600">By Student:</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs text-stone-800 focus:outline-none focus:border-indigo-600"
            >
              <option value="all">All Students & Admins</option>
              {students.map((s) => (
                <option key={s.id} value={s.id.toString()}>
                  {s.name} ({s.email_address})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Resource Type Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-600">By Resource:</label>
            <select
              value={selectedResourceType}
              onChange={(e) => setSelectedResourceType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs text-stone-800 focus:outline-none focus:border-indigo-600"
            >
              <option value="all">All Resources</option>
              <option value="auth">Authentication (Login/Signup)</option>
              <option value="note">Study Notes</option>
              <option value="comment">Discussion Comments</option>
              <option value="lesson">Lessons & Topics</option>
              <option value="user">User Accounts</option>
            </select>
          </div>

          {/* 3. Action Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-600">By Action:</label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs text-stone-800 focus:outline-none focus:border-indigo-600"
            >
              <option value="all">All Actions</option>
              <option value="signup">Sign Up</option>
              <option value="login">Login</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="destroy">Destroy / Delete</option>
            </select>
          </div>

          {/* 4. Search Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-600">Search keywords:</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, email, details..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-800 focus:outline-none focus:border-indigo-600"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Activity Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between text-xs text-stone-500 font-semibold">
          <span>Displaying {logs.length} logged events</span>
          {(selectedStudentId !== "all" ||
            selectedResourceType !== "all" ||
            selectedAction !== "all" ||
            searchQuery.trim()) && (
            <button
              type="button"
              onClick={() => {
                setSelectedStudentId("all")
                setSelectedResourceType("all")
                setSelectedAction("all")
                setSearchQuery("")
              }}
              className="text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
            >
              Reset All Filters
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-[10px] border-y border-stone-200 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Student / User</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Resource</th>
                <th className="py-2.5 px-3">Activity Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-stone-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading audit records...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-stone-400">
                    No activity recorded matching the selected filter criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50/70 transition">
                    <td className="py-3 px-3 text-stone-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-stone-400" />
                        <span className="font-mono text-[11px]">{formatTimeAgo(log.created_at)}</span>
                      </div>
                      <span className="text-[10px] text-stone-400 block font-mono">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center text-[10px] font-bold">
                          {log.user_name ? log.user_name.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-stone-900">{log.user_name || "Unknown"}</span>
                            {log.user_role === 2 ? (
                              <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1 rounded">Super</span>
                            ) : log.user_role === 1 ? (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1 rounded">Admin</span>
                            ) : (
                              <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1 rounded">Student</span>
                            )}
                          </div>
                          <span className="text-[10px] text-stone-400 font-mono block">
                            {log.user_email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-stone-700 text-[11px] font-semibold">
                        {getResourceIcon(log.resource_type)}
                        <span className="capitalize">{log.resource_type}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-stone-700 max-w-md">
                      <p className="line-clamp-2 leading-relaxed">{log.details}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

