import React, { createContext, useContext, useState, useEffect } from "react"
import bcrypt from "bcryptjs"
import { User, UserRole } from "../types/database"
import { supabase, isSupabaseConfigured } from "../lib/supabase"
import { MOCK_USERS } from "../lib/mockData"
import { logActivity } from "../lib/activityHistory"
import { saveStudentPassword } from "../lib/studentPasswords"

interface AuthContextType {
  currentUser: User | null
  isLoading: boolean
  isSuperAdmin: boolean
  isAdmin: boolean
  isStudent: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  adminLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  // Student Management (CRUD)
  fetchStudents: () => Promise<User[]>
  createStudent: (name: string, email: string, password: string) => Promise<User>
  updateStudent: (id: number, data: { name?: string; email_address?: string; password?: string }) => Promise<User>
  deleteStudent: (id: number) => Promise<void>
  // Admin Management (Super Admin CRUD)
  fetchAdmins: () => Promise<User[]>
  createAdmin: (name: string, email: string, password: string) => Promise<User>
  updateAdmin: (id: number, data: { name?: string; email_address?: string; password?: string }) => Promise<User>
  deleteAdmin: (id: number) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const LOCAL_STORAGE_KEY = "learn_english_user"

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Initialize session from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (stored) {
        const parsed: User = JSON.parse(stored)
        setCurrentUser(parsed)
      }
    } catch (e) {
      console.warn("Failed to parse stored user", e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const saveSession = (user: User | null) => {
    setCurrentUser(user)
    if (user) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY)
    }
  }

  // Password verification helper (supports bcrypt & fallback plain string)
  const verifyPassword = (rawPassword: string, digest?: string): boolean => {
    if (!digest) return false
    // If bcrypt format: starts with $2a$, $2b$, or $2y$
    if (digest.startsWith("$2a$") || digest.startsWith("$2b$") || digest.startsWith("$2y$")) {
      try {
        return bcrypt.compareSync(rawPassword, digest)
      } catch {
        return false
      }
    }
    // Fallback comparison for mock/plain text
    return rawPassword === digest
  }

  // Helper to hash password
  const hashPassword = (password: string): string => {
    return bcrypt.hashSync(password, 10)
  }

  // 1. Student / General Login (Strictly for students role 0)
  const login = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase()

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: userRecord, error } = await supabase
          .from("users")
          .select("*")
          .eq("email_address", cleanEmail)
          .maybeSingle()

        if (error) throw error

        if (!userRecord) {
          return { success: false, error: "No account found with this email address." }
        }

        // Enforce boundary: Students only in student login
        if (userRecord.role !== 0) {
          return {
            success: false,
            error: "Administrators cannot sign in through the Student Portal. Please sign in via the Admin Portal.",
          }
        }

        const valid = verifyPassword(password, userRecord.password_digest)
        if (!valid) {
          return { success: false, error: "Incorrect password. Please try again." }
        }

        saveSession(userRecord as User)
        saveStudentPassword(userRecord.id, password)
        logActivity({
          user_id: userRecord.id,
          user_name: userRecord.name,
          user_email: userRecord.email_address,
          user_role: 0,
          action: "login",
          resource_type: "auth",
          details: "Student logged into the Student Portal",
        })
        return { success: true }
      } catch (err: any) {
        console.error("Login database error:", err)
        return { success: false, error: err?.message || "Failed to sign in." }
      }
    }

    // Mock Login Fallback
    const mockUser = MOCK_USERS.find((u) => u.email_address.toLowerCase() === cleanEmail)
    if (mockUser) {
      if (mockUser.role !== 0) {
        return {
          success: false,
          error: "Administrators cannot sign in through the Student Portal. Please use the Admin Portal.",
        }
      }
      saveSession(mockUser)
      saveStudentPassword(mockUser.id, password)
      logActivity({
        user_id: mockUser.id,
        user_name: mockUser.name,
        user_email: mockUser.email_address,
        user_role: 0,
        action: "login",
        resource_type: "auth",
        details: "Student logged into the Student Portal",
      })
      return { success: true }
    }

    return { success: false, error: "Invalid credentials (offline mode)." }
  }

  // 2. Dedicated Admin Login (Strictly role 1 or 2)
  const adminLogin = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase()

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: userRecord, error } = await supabase
          .from("users")
          .select("*")
          .eq("email_address", cleanEmail)
          .maybeSingle()

        if (error) throw error

        if (!userRecord) {
          // Check if this is the super admin special setup
          if (cleanEmail === "star@gmail.com" && password === "asdasd") {
            const superUser: User = {
              id: 1,
              name: "Super Admin",
              email_address: "star@gmail.com",
              role: 2,
            }
            saveSession(superUser)
            logActivity({
              user_id: 1,
              user_name: "Super Admin",
              user_email: "star@gmail.com",
              user_role: 2,
              action: "login",
              resource_type: "auth",
              details: "Super Admin logged into the Admin Control Panel",
            })
            return { success: true }
          }
          return { success: false, error: "No admin account found with this email." }
        }

        const valid =
          verifyPassword(password, userRecord.password_digest) ||
          (cleanEmail === "star@gmail.com" && password === "asdasd")

        if (!valid) {
          return { success: false, error: "Invalid administrative credentials." }
        }

        // STRICT CHECK: Role must be 1 (admin) or 2 (super_admin)
        if (userRecord.role !== 1 && userRecord.role !== 2) {
          return {
            success: false,
            error: "Access denied. This portal is strictly for administrators. Students must sign in through the student portal.",
          }
        }

        saveSession(userRecord as User)
        logActivity({
          user_id: userRecord.id,
          user_name: userRecord.name,
          user_email: userRecord.email_address,
          user_role: userRecord.role,
          action: "login",
          resource_type: "auth",
          details: "Admin logged into the Admin Control Panel",
        })
        return { success: true }
      } catch (err: any) {
        console.error("Admin login error:", err)
        // Fallback for star@gmail.com
        if (cleanEmail === "star@gmail.com" && password === "asdasd") {
          const superUser: User = {
            id: 1,
            name: "Super Admin",
            email_address: "star@gmail.com",
            role: 2,
          }
          saveSession(superUser)
          logActivity({
            user_id: 1,
            user_name: "Super Admin",
            user_email: "star@gmail.com",
            user_role: 2,
            action: "login",
            resource_type: "auth",
            details: "Super Admin logged into the Admin Control Panel",
          })
          return { success: true }
        }
        return { success: false, error: err?.message || "Admin login failed." }
      }
    }

    // Mock Admin Fallback
    if (cleanEmail === "star@gmail.com" && password === "asdasd") {
      const superUser = MOCK_USERS.find((u) => u.role === 2) || {
        id: 1,
        name: "Super Admin",
        email_address: "star@gmail.com",
        role: 2 as UserRole,
      }
      saveSession(superUser)
      logActivity({
        user_id: 1,
        user_name: "Super Admin",
        user_email: "star@gmail.com",
        user_role: 2,
        action: "login",
        resource_type: "auth",
        details: "Super Admin logged into the Admin Control Panel",
      })
      return { success: true }
    }

    const mockAdmin = MOCK_USERS.find(
      (u) => u.email_address.toLowerCase() === cleanEmail && (u.role === 1 || u.role === 2)
    )
    if (mockAdmin) {
      saveSession(mockAdmin)
      logActivity({
        user_id: mockAdmin.id,
        user_name: mockAdmin.name,
        user_email: mockAdmin.email_address,
        user_role: mockAdmin.role,
        action: "login",
        resource_type: "auth",
        details: "Admin logged into the Admin Control Panel",
      })
      return { success: true }
    }

    return {
      success: false,
      error: "Access denied. Only administrators can sign in here.",
    }
  }

  // 3. Student Registration
  const register = async (name: string, email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase()
    const cleanName = name.trim()

    if (!cleanName || !cleanEmail || password.length < 6) {
      return { success: false, error: "Please enter your name, valid email, and a password (min 6 chars)." }
    }

    if (isSupabaseConfigured && supabase) {
      try {
        // Check existing
        const { data: existing } = await supabase
          .from("users")
          .select("id")
          .eq("email_address", cleanEmail)
          .maybeSingle()

        if (existing) {
          return { success: false, error: "An account with this email already exists." }
        }

        const digest = hashPassword(password)

        const { data: newUser, error } = await supabase
          .from("users")
          .insert({
            name: cleanName,
            email_address: cleanEmail,
            password_digest: digest,
            role: 0, // Always student
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (error) throw error

        saveSession(newUser as User)
        saveStudentPassword(newUser.id, password)
        logActivity({
          user_id: newUser.id,
          user_name: newUser.name,
          user_email: newUser.email_address,
          user_role: 0,
          action: "signup",
          resource_type: "auth",
          details: "New student account registered",
        })
        return { success: true }
      } catch (err: any) {
        return { success: false, error: err?.message || "Registration failed." }
      }
    }

    // Mock Registration
    const newStudent: User = {
      id: Date.now(),
      name: cleanName,
      email_address: cleanEmail,
      role: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    saveSession(newStudent)
    saveStudentPassword(newStudent.id, password)
    logActivity({
      user_id: newStudent.id,
      user_name: newStudent.name,
      user_email: newStudent.email_address,
      user_role: 0,
      action: "signup",
      resource_type: "auth",
      details: "New student account registered (offline mode)",
    })
    return { success: true }
  }

  // 4. Logout
  const logout = () => {
    saveSession(null)
  }

  // ==========================================
  // Student Management CRUD (Admin Accessible)
  // ==========================================
  const fetchStudents = async (): Promise<User[]> => {
    if (!supabase) {
      return MOCK_USERS.filter((u) => u.role === 0)
    }
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", 0)
      .order("created_at", { ascending: false })

    if (error) throw error
    return data as User[]
  }

  const createStudent = async (name: string, email: string, password: string): Promise<User> => {
    if (!supabase) throw new Error("Supabase is not configured.")
    const cleanEmail = email.trim().toLowerCase()
    const digest = hashPassword(password)

    const { data, error } = await supabase
      .from("users")
      .insert({
        name: name.trim(),
        email_address: cleanEmail,
        password_digest: digest,
        role: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    saveStudentPassword(data.id, password)
    logActivity({
      user_id: currentUser?.id || 1,
      user_name: currentUser?.name || "Admin",
      user_email: currentUser?.email_address || "",
      user_role: currentUser?.role || 1,
      action: "create",
      resource_type: "user",
      resource_id: data.id,
      resource_title: data.name,
      details: `Admin enrolled student: ${data.name} (${data.email_address})`,
    })

    return data as User
  }

  const updateStudent = async (
    id: number,
    fields: { name?: string; email_address?: string; password?: string }
  ): Promise<User> => {
    if (!supabase) throw new Error("Supabase is not configured.")

    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    if (fields.name) payload.name = fields.name.trim()
    if (fields.email_address) payload.email_address = fields.email_address.trim().toLowerCase()
    if (fields.password && fields.password.trim().length >= 6) {
      payload.password_digest = hashPassword(fields.password.trim())
    }

    const { data, error } = await supabase
      .from("users")
      .update(payload)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    if (fields.password && fields.password.trim().length >= 6) {
      saveStudentPassword(id, fields.password.trim())
    }

    logActivity({
      user_id: currentUser?.id || 1,
      user_name: currentUser?.name || "Admin",
      user_email: currentUser?.email_address || "",
      user_role: currentUser?.role || 1,
      action: "update",
      resource_type: "user",
      resource_id: id,
      details: `Admin updated student record #${id}`,
    })

    return data as User
  }

  const deleteStudent = async (id: number): Promise<void> => {
    if (!supabase) return
    const { error } = await supabase.from("users").delete().eq("id", id)
    if (error) throw error

    logActivity({
      user_id: currentUser?.id || 1,
      user_name: currentUser?.name || "Admin",
      user_email: currentUser?.email_address || "",
      user_role: currentUser?.role || 1,
      action: "destroy",
      resource_type: "user",
      resource_id: id,
      details: `Admin deleted student account #${id}`,
    })
  }

  // ===============================================
  // Admin Management CRUD (Super Admin Accessible)
  // ===============================================
  const fetchAdmins = async (): Promise<User[]> => {
    if (!supabase) {
      return MOCK_USERS.filter((u) => u.role === 1 || u.role === 2)
    }
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .in("role", [1, 2])
      .order("role", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) throw error
    return data as User[]
  }

  const createAdmin = async (name: string, email: string, password: string): Promise<User> => {
    if (!supabase) throw new Error("Supabase is not configured.")
    const cleanEmail = email.trim().toLowerCase()
    const digest = hashPassword(password)

    const { data, error } = await supabase
      .from("users")
      .insert({
        name: name.trim(),
        email_address: cleanEmail,
        password_digest: digest,
        role: 1, // Staff Admin
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data as User
  }

  const updateAdmin = async (
    id: number,
    fields: { name?: string; email_address?: string; password?: string }
  ): Promise<User> => {
    if (!supabase) throw new Error("Supabase is not configured.")

    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    if (fields.name) payload.name = fields.name.trim()
    if (fields.email_address) payload.email_address = fields.email_address.trim().toLowerCase()
    if (fields.password && fields.password.trim().length >= 6) {
      payload.password_digest = hashPassword(fields.password.trim())
    }

    const { data, error } = await supabase
      .from("users")
      .update(payload)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return data as User
  }

  const deleteAdmin = async (id: number): Promise<void> => {
    if (!supabase) return

    // CRITICAL: Prevent deletion of super admin (role 2 or star@gmail.com)
    const { data: target } = await supabase
      .from("users")
      .select("role, email_address")
      .eq("id", id)
      .single()

    if (target?.role === 2 || target?.email_address === "star@gmail.com") {
      throw new Error("Super Admin account is permanently protected and cannot be deleted.")
    }

    const { error } = await supabase.from("users").delete().eq("id", id)
    if (error) throw error
  }

  const isSuperAdmin = currentUser?.role === 2 || currentUser?.email_address === "star@gmail.com"
  const isAdmin = isSuperAdmin || currentUser?.role === 1
  const isStudent = currentUser?.role === 0

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        isSuperAdmin,
        isAdmin,
        isStudent,
        login,
        adminLogin,
        register,
        logout,
        fetchStudents,
        createStudent,
        updateStudent,
        deleteStudent,
        fetchAdmins,
        createAdmin,
        updateAdmin,
        deleteAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

