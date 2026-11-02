import React, { useState, useEffect, useRef } from "react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import {
  ShieldCheck,
  LogIn,
  LogOut,
  BookOpen,
  Sparkles,
  FileText,
  Home,
  Menu,
  X,
  Bell,
  Check,
  Clock,
  User,
  CheckCheck,
} from "lucide-react"
import {
  getUserNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearUserNotifications,
  NotificationItem,
} from "../lib/notifications"

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

export default function Navbar() {
  const { currentUser, isAdmin, logout } = useAuth()
  const location = useLocation()
  const pathname = location.pathname

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const notifRef = useRef<HTMLDivElement>(null)

  // Reload notifications on update event or user change
  const reloadNotifications = () => {
    if (currentUser?.id) {
      const items = getUserNotifications(currentUser.id)
      setNotifications(items)
      setUnreadCount(getUnreadCount(currentUser.id))
    } else {
      setNotifications([])
      setUnreadCount(0)
    }
  }

  useEffect(() => {
    reloadNotifications()

    const handleUpdate = () => reloadNotifications()
    window.addEventListener("learn_english_notifications_updated", handleUpdate)
    return () => {
      window.removeEventListener("learn_english_notifications_updated", handleUpdate)
    }
  }, [currentUser?.id])

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showNotifications])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
    setShowNotifications(false)
  }, [pathname])

  // The admin portal has its own dedicated layout & header
  if (pathname.startsWith("/admin")) {
    return null
  }

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true
    if (path !== "/" && pathname.startsWith(path)) return true
    return false
  }

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-emerald-900/10 shadow-2xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 text-stone-900 group">
              <div className="w-8 h-8 rounded-lg bg-emerald-800 flex items-center justify-center text-white font-bold text-sm shadow-xs group-hover:bg-emerald-700 transition">
                LE
              </div>
              <div>
                <span className="font-bold text-base tracking-tight block leading-tight">Learn English</span>
                <span className="text-[10px] text-stone-500 font-medium tracking-wide uppercase block -mt-0.5">
                  Daily Hinglish
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            {currentUser && (
              <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-stone-200">
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 transition flex items-center gap-1.5 shadow-2xs mr-2"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Admin Panel</span>
                  </Link>
                )}

                <Link
                  to="/"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    isActive("/")
                      ? "bg-emerald-50 text-emerald-800"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                  }`}
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Home</span>
                </Link>

                <Link
                  to="/topics"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    isActive("/topics")
                      ? "bg-emerald-50 text-emerald-800"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Foundational Topics</span>
                </Link>

                <Link
                  to="/lessons"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    isActive("/lessons")
                  ? "bg-emerald-50 text-emerald-800"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Daily Classes</span>
                </Link>

                <Link
                  to="/notes"
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    isActive("/notes")
                      ? "bg-emerald-50 text-emerald-800"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>My Notes</span>
                </Link>
              </nav>
            )}
          </div>

          {/* Right Controls: Notifications, User, Hamburger */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification Bell Icon */}
            {currentUser && (
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Popover Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white border border-stone-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Bell className="w-4 h-4 text-emerald-700" />
                        <span className="text-xs font-bold text-stone-900">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="text-[10px] font-mono bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded-full font-bold">
                            {unreadCount} new
                          </span>
                        )}
                      </div>

                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (currentUser) markAllNotificationsAsRead(currentUser.id)
                          }}
                          className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCheck className="w-3 h-3" />
                          <span>Mark all read</span>
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
                      {notifications.length === 0 ? (
                        <div className="py-10 text-center text-xs text-stone-400 space-y-1">
                          <Bell className="w-6 h-6 mx-auto text-stone-300 mb-1" />
                          <p className="font-semibold text-stone-600">No notifications yet</p>
                          <p className="text-[11px] text-stone-400">
                            When peers react to your notes or comments, you will see alerts here.
                          </p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => markNotificationAsRead(notif.id)}
                            className={`p-3 text-xs flex items-start gap-2.5 transition cursor-pointer hover:bg-stone-50 ${
                              notif.read ? "bg-white text-stone-600" : "bg-emerald-50/40 text-stone-900 font-medium"
                            }`}
                          >
                            <div className="w-7 h-7 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-sm shrink-0">
                              {notif.emoji || "✨"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs leading-snug break-words">{notif.message}</p>
                              {notif.content_preview && (
                                <p className="text-[11px] text-stone-400 italic truncate mt-0.5">
                                  &ldquo;{notif.content_preview}&rdquo;
                                </p>
                              )}
                              <span className="text-[10px] text-stone-400 font-mono block mt-1 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{formatTimeAgo(notif.created_at)}</span>
                              </span>
                            </div>
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 mt-1.5"></span>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {notifications.length > 0 && (
                      <div className="p-2 border-t border-stone-100 text-center bg-stone-50/50">
                        <button
                          type="button"
                          onClick={() => {
                            if (currentUser) clearUserNotifications(currentUser.id)
                          }}
                          className="text-[11px] text-stone-400 hover:text-rose-600 transition cursor-pointer"
                        >
                          Clear notification history
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Desktop User Info & Sign Out */}
            {currentUser ? (
              <div className="hidden sm:flex items-center gap-2.5">
                <span className="text-xs text-stone-700 font-semibold">{currentUser.name}</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {currentUser.role === 2 ? "Super Admin" : currentUser.role === 1 ? "Admin" : "Student"}
                </span>
                <button
                  onClick={logout}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-700 transition flex items-center gap-1.5 cursor-pointer ml-1"
                  title="Sign out of student account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/auth/sign-in"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg text-stone-700 hover:bg-stone-100 transition flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/auth/sign-up"
                  className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition shadow-2xs"
                >
                  Join Free
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-stone-700 hover:bg-stone-100 transition cursor-pointer border border-stone-200"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu (Opened via Hamburger) */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-stone-200 space-y-2 animate-in slide-in-from-top-2 duration-150">
            {currentUser && (
              <div className="px-3 py-2 bg-stone-50 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center text-xs">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-bold text-stone-900 block leading-tight">{currentUser.name}</span>
                    <span className="text-[10px] text-stone-500 font-mono">{currentUser.email_address}</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {currentUser.role === 2 ? "Super Admin" : currentUser.role === 1 ? "Admin" : "Student"}
                </span>
              </div>
            )}

            <nav className="flex flex-col gap-1 text-xs font-semibold">
              {isAdmin && (
                <Link
                  to="/admin"
                  className="px-3.5 py-2.5 rounded-xl bg-stone-900 text-white font-bold flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Admin Control Panel</span>
                </Link>
              )}

              <Link
                to="/"
                className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 ${
                  isActive("/") ? "bg-emerald-50 text-emerald-800 font-bold" : "text-stone-700 hover:bg-stone-100"
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Link>

              <Link
                to="/topics"
                className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 ${
                  isActive("/topics")
                    ? "bg-emerald-50 text-emerald-800 font-bold"
                    : "text-stone-700 hover:bg-stone-100"
                }`}
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Foundational Topics</span>
              </Link>

              <Link
                to="/lessons"
                className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 ${
                  isActive("/lessons")
                    ? "bg-emerald-50 text-emerald-800 font-bold"
                    : "text-stone-700 hover:bg-stone-100"
                }`}
              >
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Daily Classes</span>
              </Link>

              <Link
                to="/notes"
                className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 ${
                  isActive("/notes")
                    ? "bg-emerald-50 text-emerald-800 font-bold"
                    : "text-stone-700 hover:bg-stone-100"
                }`}
              >
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Community & Study Notes</span>
              </Link>
            </nav>

            {/* Mobile Auth Actions */}
            <div className="pt-2 border-t border-stone-100">
              {currentUser ? (
                <button
                  type="button"
                  onClick={logout}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-2 cursor-pointer transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of Account</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    to="/auth/sign-in"
                    className="text-center py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/auth/sign-up"
                    className="text-center py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 shadow-2xs"
                  >
                    Join Free
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
