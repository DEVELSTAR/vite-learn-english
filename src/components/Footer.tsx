import React from "react"
import { Link } from "react-router-dom"
import { ShieldCheck, Heart } from "lucide-react"

export default function Footer() {
  return (
    <footer className="border-t border-emerald-900/10 bg-white/60 backdrop-blur-xs mt-20 py-10 text-xs text-stone-500">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-800 text-white font-bold flex items-center justify-center text-[11px]">
            LE
          </div>
          <span className="font-semibold text-stone-700">Learn English</span>
          <span>&copy; {new Date().getFullYear()} &bull; Built with</span>
          <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
          <span>for curious learners</span>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/" className="hover:text-stone-900 transition">
            Home
          </Link>
          <Link to="/topics" className="hover:text-stone-900 transition">
            Topics
          </Link>
          <Link to="/lessons" className="hover:text-stone-900 transition">
            Daily Classes
          </Link>
          <Link to="/notes" className="hover:text-stone-900 transition">
            Notes
          </Link>
          <Link
            to="/admin/login"
            className="flex items-center gap-1 font-semibold text-emerald-800 hover:text-emerald-950 transition"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Sign In</span>
          </Link>
        </div>
      </div>
    </footer>
  )
}
