import React, { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import { User } from "../../types/database"
import { Users, Plus, Search, Trash2, Edit2, Loader2, X, Check, Eye, EyeOff, Lock } from "lucide-react"
import { fetchAllStudentPasswords } from "../../lib/studentPasswords"

export default function StudentManager() {
  const { fetchStudents, createStudent, updateStudent, deleteStudent } = useAuth()

  const [students, setStudents] = useState<User[]>([])
  const [passwords, setPasswords] = useState<Record<number, string>>({})
  const [visiblePasswordIds, setVisiblePasswordIds] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<User | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showModalPassword, setShowModalPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [data, pwds] = await Promise.all([
        fetchStudents(),
        fetchAllStudentPasswords(),
      ])
      setStudents(data)
      setPasswords(pwds)
    } catch (err: any) {
      console.error("Failed to load students:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const togglePasswordVisibility = (studentId: number) => {
    setVisiblePasswordIds((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) {
        next.delete(studentId)
      } else {
        next.add(studentId)
      }
      return next
    })
  }

  const openCreateModal = () => {
    setEditingStudent(null)
    setName("")
    setEmail("")
    setPassword("")
    setShowModalPassword(true)
    setModalError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (student: User) => {
    setEditingStudent(student)
    setName(student.name)
    setEmail(student.email_address)
    setPassword(passwords[student.id] || "")
    setShowModalPassword(false)
    setModalError(null)
    setIsModalOpen(true)
  }

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setModalError(null)

    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, {
          name,
          email_address: email,
          password: password.trim() ? password.trim() : undefined,
        })
      } else {
        if (!password || password.length < 6) {
          throw new Error("Password must be at least 6 characters.")
        }
        await createStudent(name, email, password)
      }
      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      setModalError(err?.message || "Failed to save student.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (student: User) => {
    if (!confirm(`Are you sure you want to delete student "${student.name}" (${student.email_address})?`)) return

    try {
      await deleteStudent(student.id)
      setStudents((prev) => prev.filter((s) => s.id !== student.id))
    } catch (err: any) {
      alert(err?.message || "Failed to delete student.")
    }
  }

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email_address.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            <span>Student Management</span>
          </h1>
          <p className="text-xs text-stone-500">
            View registered learners, view their passwords, manually create accounts, or reset passwords.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Student</span>
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition"
            />
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <span className="text-xs text-stone-500 font-semibold self-start sm:self-auto">
            Total Students: {students.length}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-[10px] border-y border-stone-200 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Student Name</th>
                <th className="py-2.5 px-3">Email Address</th>
                <th className="py-2.5 px-3">Password</th>
                <th className="py-2.5 px-3">Joined Date</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-stone-400">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                    <span>Loading student records...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-stone-400">
                    No students found. Click &quot;Add New Student&quot; to enroll learners.
                  </td>
                </tr>
              ) : (
                filtered.map((student) => {
                  const plainPassword = passwords[student.id]
                  const isVisible = visiblePasswordIds.has(student.id)

                  return (
                    <tr key={student.id} className="hover:bg-stone-50/60 transition">
                      <td className="py-3 px-3 font-bold text-stone-900 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{student.name}</span>
                      </td>
                      <td className="py-3 px-3 text-stone-600 font-mono text-[11px]">{student.email_address}</td>
                      <td className="py-3 px-3">
                        <div className="inline-flex items-center gap-1.5 bg-stone-100 px-2 py-1 rounded-lg border border-stone-200 font-mono text-[11px]">
                          <Lock className="w-3 h-3 text-stone-400" />
                          <span>
                            {isVisible
                              ? plainPassword || "••••••••"
                              : "••••••••"}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(student.id)}
                            className="text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
                            title={isVisible ? "Hide password" : "Show password"}
                          >
                            {isVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-stone-400">
                        {student.created_at ? new Date(student.created_at).toLocaleDateString() : "Active"}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(student)}
                            className="p-1.5 hover:bg-stone-100 text-stone-600 rounded-lg transition cursor-pointer"
                            title="Edit Student or View/Reset Password"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(student)}
                            className="p-1.5 hover:bg-red-50 text-stone-400 hover:text-red-600 rounded-lg transition cursor-pointer"
                            title="Delete Student"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span>{editingStudent ? "Edit Student Account" : "Enroll New Student"}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Verma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">
                  {editingStudent ? "Student Password" : "Password (min 6 chars)"}
                </label>
                <div className="relative">
                  <input
                    type={showModalPassword ? "text" : "password"}
                    required={!editingStudent}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingStudent ? "Enter new password to change..." : "Enter password..."}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalPassword(!showModalPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5"
                  >
                    {showModalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {editingStudent && (
                  <p className="text-[10px] text-stone-400">
                    Leave unchanged to preserve the student&apos;s current password.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white rounded-xl font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{editingStudent ? "Update Account" : "Enroll Student"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
