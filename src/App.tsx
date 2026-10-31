import React from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import SetupBanner from "./components/SetupBanner"

// Pages
import HomePage from "./pages/HomePage"
import LessonsPage from "./pages/LessonsPage"
import TopicsPage from "./pages/TopicsPage"
import LessonDetailPage from "./pages/LessonDetailPage"
import NotesPage from "./pages/NotesPage"
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

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col justify-between selection:bg-emerald-200 selection:text-emerald-900">
        <div>
          <SetupBanner />
          <Navbar />
          <Routes>
            {/* Public Student Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/lessons" element={<LessonsPage />} />
            <Route path="/topics" element={<TopicsPage />} />
            <Route path="/lessons/:slug" element={<LessonDetailPage />} />
            <Route path="/topics/:slug" element={<LessonDetailPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/auth/sign-in" element={<SignInPage />} />
            <Route path="/auth/sign-up" element={<SignUpPage />} />

            {/* Admin Dedicated Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="login" element={<AdminLoginPage />} />
              <Route index element={<AdminDashboardPage />} />
              <Route path="lessons/new" element={<NewLessonPage />} />
              <Route path="lessons/:id/edit" element={<EditLessonPage />} />
              <Route path="students" element={<AdminStudentsPage />} />
              <Route path="admins" element={<AdminAdminsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        <Footer />
      </div>
    </AuthProvider>
  )
}

