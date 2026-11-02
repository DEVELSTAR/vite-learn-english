import React, { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { getStudentPassword } from "../lib/studentPasswords"
import { formatISTDate } from "../lib/dateUtils"
import {
  User,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  Shield,
  Calendar,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  FileText,
  LogOut,
} from "lucide-react"
import { Link } from "react-router-dom"

export default function ProfilePage() {
  const { currentUser, updateProfile, logout } = useAuth()

  // Profile Form States
  const [name, setName] = useState(currentUser?.name || "")
  const [email, setEmail] = useState(currentUser?.email_address || "")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Current password retrieved from store
  const [currentPassword, setCurrentPassword] = useState<string>("")
  const [isLoadingPassword, setIsLoadingPassword] = useState<boolean>(true)
  const [copied, setCopied] = useState(false)

  // Feedback States
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Fetch current stored password on mount
  useEffect(() => {
    async function loadPassword() {
      if (!currentUser?.id) return
      setIsLoadingPassword(true)
      try {
        const pass = await getStudentPassword(currentUser.id)
        setCurrentPassword(pass || "")
      } catch (err) {
        console.warn("Failed to retrieve current password:", err)
      } finally {
        setIsLoadingPassword(false)
      }
    }
    loadPassword()
  }, [currentUser?.id])

  // Sync state if currentUser changes
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || "")
      setEmail(currentUser.email_address || "")
    }
  }, [currentUser])

  const handleCopyPassword = () => {
    if (!currentPassword) return
    navigator.clipboard.writeText(currentPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage(null)
    setErrorMessage(null)

    if (!name.trim()) {
      setErrorMessage("Please enter your name.")
      return
    }

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.")
      return
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        setErrorMessage("New password must be at least 6 characters long.")
        return
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage("New passwords do not match. Please verify and try again.")
        return
      }
    }

    setIsSaving(true)
    try {
      const res = await updateProfile({
        name: name.trim(),
        email_address: email.trim().toLowerCase(),
        password: newPassword ? newPassword.trim() : undefined,
      })

      if (!res.success) {
        setErrorMessage(res.error || "Failed to update profile.")
      } else {
        setSuccessMessage("Your profile and security credentials have been updated successfully!")
        if (newPassword) {
          setCurrentPassword(newPassword.trim())
          setNewPassword("")
          setConfirmPassword("")
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred while saving changes.")
    } finally {
      setIsSaving(false)
    }
  }

  if (!currentUser) return null

  const roleLabel =
    currentUser.role === 2 ? "Super Admin" : currentUser.role === 1 ? "Admin" : "Student Learner"

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header Profile Badge */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-800 text-white font-bold text-2xl flex items-center justify-center shadow-md shrink-0">
            {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-stone-900">{currentUser.name}</h1>
              {currentUser.role !== undefined && currentUser.role >= 1 && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {roleLabel}
                </span>
              )}
            </div>
            <p className="text-sm text-stone-500 font-mono mt-0.5">{currentUser.email_address}</p>
            {currentUser.created_at && (
              <p className="text-xs text-stone-400 flex items-center gap-1.5 mt-2">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>Joined on {formatISTDate(currentUser.created_at)}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            to="/notes"
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs font-semibold text-stone-700 flex items-center justify-center gap-1.5 transition"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-700" />
            <span>My Notes</span>
          </Link>
          <button
            onClick={logout}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-xs font-semibold text-rose-600 flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 text-xs font-medium animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-900 text-xs font-medium animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Current Password Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-stone-900 font-bold text-sm">
              <KeyRound className="w-4 h-4 text-emerald-700" />
              <span>Current Password</span>
            </div>
            <p className="text-xs text-stone-500 leading-relaxed">
              You can view and copy your active login password anytime.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-stone-600 block">Saved Password</label>
              <div className="relative flex items-center">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  readOnly
                  value={
                    isLoadingPassword
                      ? "Loading..."
                      : currentPassword
                      ? currentPassword
                      : "••••••••"
                  }
                  className="w-full pl-3 pr-20 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono text-stone-800 select-all focus:outline-none"
                />
                <div className="absolute right-1.5 flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition cursor-pointer"
                    title={showCurrentPassword ? "Hide password" : "Show password"}
                  >
                    {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  {currentPassword && (
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-emerald-700 hover:bg-stone-200/60 transition cursor-pointer"
                      title="Copy password"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
              {copied && (
                <p className="text-[11px] text-emerald-700 font-medium">Password copied to clipboard!</p>
              )}
            </div>

            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 text-[11px] text-stone-500 space-y-1">
              <p className="font-semibold text-stone-700">Password Tips</p>
              <ul className="list-disc list-inside space-y-0.5 text-stone-500">
                <li>Keep your credentials safe</li>
                <li>Never share passwords on public chats</li>
                <li>Use at least 6 characters</li>
              </ul>
            </div>
          </div>

          <div className="bg-emerald-900 text-white rounded-3xl p-6 shadow-xs space-y-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-300" />
              <span>Ready to Learn?</span>
            </h3>
            <p className="text-xs text-emerald-100 leading-relaxed">
              Continue your daily classes or practice Hinglish conversation with your AI tutor.
            </p>
            <Link
              to="/lessons"
              className="inline-block mt-2 px-4 py-2 bg-white text-emerald-950 font-bold text-xs rounded-xl hover:bg-emerald-50 transition shadow-2xs"
            >
              Browse Daily Classes &rarr;
            </Link>
          </div>
        </div>

        {/* Right Column: Update Profile & Change Password Form */}
        <div className="md:col-span-2">
          <form
            onSubmit={handleProfileSubmit}
            className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6"
          >
            <div>
              <h2 className="text-base font-bold text-stone-900">Edit Profile & Credentials</h2>
              <p className="text-xs text-stone-500 mt-1">
                Update your display name, email address, or set a new password.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Full Name"
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-stone-900">Change Password</h3>
                  <p className="text-[11px] text-stone-500">
                    Leave blank if you don&apos;t want to change your current password.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        minLength={6}
                        className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        minLength={6}
                        className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

