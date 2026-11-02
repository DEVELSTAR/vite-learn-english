import React, { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { UserPlus, Mail, Lock, User, AlertCircle, Loader2, KeyRound, Eye, EyeOff } from "lucide-react"

export default function SignUpPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { register, currentUser } = useAuth()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const queryParams = new URLSearchParams(location.search)
  const redirectTo = queryParams.get("redirectTo") || "/"

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 1 || currentUser.role === 2) {
        navigate("/admin", { replace: true })
      } else {
        navigate(redirectTo, { replace: true })
      }
    }
  }, [currentUser, navigate, redirectTo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const res = await register(name, email, password)
    if (res.success) {
      navigate(redirectTo, { replace: true })
    } else {
      setError(res.error || "Failed to create account.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-3xl p-8 sm:p-10 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-2">
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">Create Student Account</h1>
          <p className="text-xs text-stone-500">Join thousands of learners overcoming English hesitation.</p>
        </div>

        {redirectTo !== "/" && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
            <KeyRound className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Create a free account to unlock all classes, AI Tutor, and notes.</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-stone-700">Full Name</label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aman Sharma"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
              />
              <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-stone-700">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
              />
              <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-stone-700">Password (min 6 characters)</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
              />
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-stone-400 hover:text-stone-700 absolute right-3 top-1/2 -translate-y-1/2 p-0.5 cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            <span>Sign Up & Start Learning</span>
          </button>
        </form>

        <div className="pt-2 text-center border-t border-stone-100 text-xs text-stone-500">
          <p>
            Already have an account?{" "}
            <Link
              to={redirectTo !== "/" ? `/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}` : "/auth/sign-in"}
              className="font-bold text-emerald-800 hover:underline"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
