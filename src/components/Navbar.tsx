import React from "react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { ShieldCheck, LogIn, LogOut, BookOpen, Sparkles, FileText, Home } from "lucide-react"

export default function Navbar() {
  const { currentUser, isAdmin, logout } = useAuth()
  const location = useLocation()
  const pathname = location.pathname

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
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-emerald-900/10 shadow-2xs">
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
                <span className="text-[10px] text-stone-500 font-medium tracking-wide uppercase block -mt-0.5">Daily Hinglish</span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
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
          </div>

          {/* User controls */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-stone-700 font-medium hidden sm:inline">
                  {currentUser.name}
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 hidden sm:inline">
                  {currentUser.role === 2 ? "Super Admin" : currentUser.role === 1 ? "Admin" : "Student"}
                </span>
                <button
                  onClick={logout}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-700 transition flex items-center gap-1.5 cursor-pointer"
                  title="Sign out of student account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
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
          </div>
        </div>
      </div>
    </header>
  )
}

