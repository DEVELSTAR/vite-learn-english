import React from "react"
import { Link, useLocation, Navigate, Outlet } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { ShieldCheck, LogOut, BookOpen, Users, UserCheck, History, ExternalLink } from "lucide-react"

export default function AdminLayout() {
  const { currentUser, isAdmin, isSuperAdmin, logout } = useAuth()
  const location = useLocation()
  const pathname = location.pathname

  // Public admin login page does not render the admin navigation chrome
  if (pathname === "/admin/login") {
    return <Outlet />
  }

  // Route Guard: Must be authenticated with role 1 or 2
  if (!currentUser || !isAdmin) {
    return <Navigate to={`/admin/login?redirectTo=${encodeURIComponent(pathname)}`} replace />
  }

  const isActive = (path: string) => {
    if (path === "/admin" && pathname === "/admin") return true
    if (path !== "/admin" && pathname.startsWith(path)) return true
    return false
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-6 px-4 sm:px-6">
      {/* Top Admin Nav Bar */}
      <header className="bg-stone-900 border border-stone-800 text-white rounded-2xl px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <Link
            to="/admin"
            className="font-extrabold text-sm sm:text-base tracking-wide flex items-center gap-2.5 text-white hover:text-emerald-400 transition"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span>Admin Control Panel</span>
          </Link>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1.5 text-xs font-semibold">
            <Link
              to="/admin"
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                isActive("/admin") && !pathname.startsWith("/admin/students") && !pathname.startsWith("/admin/admins") && !pathname.startsWith("/admin/history")
                  ? "bg-white/20 text-white"
                  : "bg-white/10 hover:bg-white/20 text-stone-200"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>Lessons & Topics</span>
            </Link>

            <Link
              to="/admin/students"
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                isActive("/admin/students")
                  ? "bg-white/20 text-white"
                  : "bg-white/10 hover:bg-white/20 text-stone-200"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span>Students</span>
            </Link>

            <Link
              to="/admin/history"
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                isActive("/admin/history")
                  ? "bg-white/20 text-white"
                  : "bg-white/10 hover:bg-white/20 text-stone-200"
              }`}
            >
              <History className="w-3.5 h-3.5 text-indigo-400" />
              <span>Activity History</span>
            </Link>

            {/* Strictly Super Admin can access and manage staff Admins */}
            {isSuperAdmin && (
              <Link
                to="/admin/admins"
                className={`px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 ${
                  isActive("/admin/admins")
                    ? "bg-emerald-600/50 border-emerald-400 text-white font-bold"
                    : "bg-emerald-600/30 border-emerald-500/40 hover:bg-emerald-600/40 text-emerald-300 font-bold"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Admin Management</span>
              </Link>
            )}

            {/* Quick Link to Student UI */}
            <Link
              to="/"
              className="px-3 py-1.5 rounded-lg bg-emerald-800/60 hover:bg-emerald-800 border border-emerald-600/40 text-emerald-200 hover:text-white transition flex items-center gap-1.5"
              title="Browse app as student"
            >
              <span>Student View</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </nav>
        </div>

        {/* Right: Profile Info & Sign Out */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-stone-300 font-medium">{currentUser.name}</span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                isSuperAdmin
                  ? "bg-amber-400 text-stone-950 shadow-xs"
                  : "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              {isSuperAdmin ? "Super Admin" : "Admin"}
            </span>
          </div>

          <button
            type="button"
            onClick={logout}
            className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-300 hover:text-white rounded-lg transition flex items-center gap-1.5 font-semibold cursor-pointer"
            title="Sign out of Admin Portal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Admin Page Content */}
      <main>
        <Outlet />
      </main>
    </div>
  )
}

