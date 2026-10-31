import React, { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import { User } from "../../types/database"
import { ShieldCheck, Plus, Search, Trash2, Edit2, Loader2, X, Check, Lock } from "lucide-react"

export default function AdminManager() {
  const { currentUser, isSuperAdmin, fetchAdmins, createAdmin, updateAdmin, deleteAdmin } = useAuth()

  const [admins, setAdmins] = useState<User[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const data = await fetchAdmins()
      setAdmins(data)
    } catch (err: any) {
      console.error("Failed to load admins:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (!isSuperAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-8 rounded-3xl text-center space-y-2">
        <Lock className="w-8 h-8 text-red-500 mx-auto" />
        <h2 className="text-base font-bold">Access Restricted</h2>
        <p className="text-xs text-red-600">
          Only the Super Administrator account has authorization to view or manage staff administrators.
        </p>
      </div>
    )
  }

  const openCreateModal = () => {
    setEditingAdmin(null)
    setName("")
    setEmail("")
    setPassword("")
    setModalError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (admin: User) => {
    setEditingAdmin(admin)
    setName(admin.name)
    setEmail(admin.email_address)
    setPassword("")
    setModalError(null)
    setIsModalOpen(true)
  }

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setModalError(null)

    try {
      if (editingAdmin) {
        await updateAdmin(editingAdmin.id, {
          name,
          email_address: email,
          password: password.trim() ? password.trim() : undefined,
        })
      } else {
        if (!password || password.length < 6) {
          throw new Error("Password must be at least 6 characters.")
        }
        await createAdmin(name, email, password)
      }
      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      setModalError(err?.message || "Failed to save administrator.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (admin: User) => {
    if (admin.role === 2 || admin.email_address === "star@gmail.com") {
      alert("Super Admin account is permanently protected and cannot be deleted.")
      return
    }

    if (!confirm(`Are you sure you want to delete administrator "${admin.name}" (${admin.email_address})?`)) return

    try {
      await deleteAdmin(admin.id)
      setAdmins((prev) => prev.filter((a) => a.id !== admin.id))
    } catch (err: any) {
      alert(err?.message || "Failed to delete administrator.")
    }
  }

  const filtered = admins.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email_address.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-stone-900 border border-stone-800 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Admin Management (Super Admin Exclusive)</span>
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Create, manage, and configure access for staff administrators. Super Admin is permanently protected.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff Admin</span>
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
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
            />
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <span className="text-xs text-stone-500 font-semibold self-start sm:self-auto">
            Total Admins: {admins.length}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider text-[10px] border-y border-stone-200 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Administrator</th>
                <th className="py-2.5 px-3">Role Status</th>
                <th className="py-2.5 px-3">Email Address</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-stone-400">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                    <span>Loading administrative accounts...</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-stone-400">
                    No administrators found.
                  </td>
                </tr>
              ) : (
                filtered.map((admin) => {
                  const isTargetSuper = admin.role === 2 || admin.email_address === "star@gmail.com"

                  return (
                    <tr key={admin.id} className="hover:bg-stone-50/60 transition">
                      <td className="py-3 px-3 font-bold text-stone-900 flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isTargetSuper
                              ? "bg-amber-400 text-stone-950 font-black"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {admin.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{admin.name}</span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isTargetSuper
                              ? "bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {isTargetSuper ? "Super Admin" : "Staff Admin"}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-stone-600 font-mono text-[11px]">{admin.email_address}</td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isTargetSuper ? (
                            <span
                              className="text-[10px] text-stone-400 font-medium px-2 py-1 bg-stone-100 rounded-md"
                              title="Super Admin cannot be deleted or modified"
                            >
                              Protected
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditModal(admin)}
                                className="p-1.5 hover:bg-stone-100 text-stone-600 rounded-lg transition cursor-pointer"
                                title="Edit Administrator"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(admin)}
                                className="p-1.5 hover:bg-red-50 text-stone-400 hover:text-red-600 rounded-lg transition cursor-pointer"
                                title="Delete Administrator"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
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

      {/* Add / Edit Admin Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{editingAdmin ? "Edit Administrator" : "Create Staff Admin"}</span>
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
                  placeholder="e.g. Teacher Sarah"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Admin Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@learnenglish.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">
                  {editingAdmin ? "Reset Password (leave blank to keep unchanged)" : "Password (min 6 chars)"}
                </label>
                <input
                  type="password"
                  required={!editingAdmin}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingAdmin ? "••••••••" : "Admin password..."}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{editingAdmin ? "Save Changes" : "Create Admin"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

