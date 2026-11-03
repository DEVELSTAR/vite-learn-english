import React from "react"
import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import SetupBanner from "./components/SetupBanner"
import { Loader2 } from "lucide-react"

// Pages
import HomePage from "./pages/HomePage"
import LessonsPage from "./pages/LessonsPage"
import TopicsPage from "./pages/TopicsPage"
import LessonDetailPage from "./pages/LessonDetailPage"
import NotesPage from "./pages/NotesPage"
import ProfilePage from "./pages/ProfilePage"
import SignInPage from "./pages/SignInPage"
import SignUpPage from "./pages/SignUpPage"

// Admin Pages
import AdminLayout from "./components/admin/AdminLayout"
import AdminLoginPage from "./pages/admin/AdminLoginPage"
import AdminDashboardPage from "./pages/admin/AdminDashboardPage"
import NewLessonPage from "./pages/admin/NewLessonPage"
import EditLessonPage from "./pages/admin/EditLessonPage"
import AdminStudentsPage from "./pages/admin/AdminStudentsPage"
import AdminAdminsPage from "./pages/admin/AdminAdminsPage"
import AdminHistoryPage from "./pages/admin/AdminHistoryPage"

// Route Guard: Requires student or admin to be signed in
function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { currentUser, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center space-y-3 text-stone-500">
        <div className="w-10 h-10 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-bold text-sm shadow-md animate-pulse">
          LE
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Verifying session...</span>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    const returnUrl = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/auth/sign-in?redirectTo=${returnUrl}`} replace />
  }

  return children
}

function ScrollToTop() {
  const { pathname } = useLocation()

  React.useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

function AppContent() {
  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-emerald-200 selection:text-emerald-900">
      <ScrollToTop />
      <div>
        <SetupBanner />
        <Navbar />
        <Routes>
          {/* Public Routes & Landing Page */}
          <Route path="/" element={<HomePage />} />
          <Route path="/auth/sign-in" element={<SignInPage />} />
          <Route path="/auth/sign-up" element={<SignUpPage />} />

          {/* Protected Student Routes (Require Login / Signup) */}
          <Route
            path="/lessons"
            element={
              <ProtectedRoute>
                <LessonsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/topics"
            element={
              <ProtectedRoute>
                <TopicsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lessons/:slug"
            element={
              <ProtectedRoute>
                <LessonDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/topics/:slug"
            element={
              <ProtectedRoute>
                <LessonDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes"
            element={
              <ProtectedRoute>
                <NotesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Admin Dedicated Routes (Protected by AdminLayout) */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="login" element={<AdminLoginPage />} />
            <Route index element={<AdminDashboardPage />} />
            <Route path="lessons/new" element={<NewLessonPage />} />
            <Route path="lessons/:id/edit" element={<EditLessonPage />} />
            <Route path="students" element={<AdminStudentsPage />} />
            <Route path="admins" element={<AdminAdminsPage />} />
            <Route path="history" element={<AdminHistoryPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
