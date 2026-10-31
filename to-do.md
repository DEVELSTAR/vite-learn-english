# Learn English - Vite + React + Supabase + Vercel (Ultra Fast SPA)

The application has been rebuilt from scratch as a blazing-fast **Vite + React Single-Page Application (SPA)** matching your exact PostgreSQL database schema.

| Component | Tech Choice | Deployment Platform | Status |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | Vite + React 18 + TypeScript + Tailwind CSS | **Vercel** | ✅ Root project ready |
| **Database** | PostgreSQL + Supabase Client (`@supabase/supabase-js`) | **Supabase** | ✅ Direct schema compliance |
| **Authentication** | Built-in Session Auth + Bcrypt password verification | **LocalStorage + Supabase `users` table** | ✅ Student & Admin roles |
| **AI Tutor** | Google Gemini 1.5 Flash (`@google/generative-ai`) | **Client Direct / Gemini API** | ✅ Ready in Sidebar |

---

## Database Schema Mapping

The app directly connects to and manages the tables in your PostgreSQL schema:

1. **`lessons`**: `id`, `title`, `slug`, `lesson_date`, `topic`, `introduction`, `status` (0: draft, 1: published), `author_id`, `lesson_type` (0: daily_class, 1: foundational_topic), `position`.
2. **`action_text_rich_texts`**: Stores rich HTML lesson body (`name: 'content'`, `record_type: 'Lesson'`, `record_id: lesson.id`, `body: ...`).
3. **`users`**: `id`, `name`, `email_address`, `password_digest` (bcrypt), `role` (0: student, 1: admin, 2: super_admin).
4. **`lesson_completions`**: `user_id`, `lesson_id`, `completed`, `needs_revision`, `completed_at`.
5. **`lesson_comments`**: Threaded discussion comments per lesson (`lesson_id`, `user_id`, `parent_id`, `content`).
6. **`lesson_chat_messages`**: Chat history with the AI Tutor ("Ask Akib Sir").
7. **`notes`**: Student private notes (`user_id`, `lesson_id`, `content`, `is_global`).

---

## Local Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Deploying to Vercel (1-Click Deployment)

1. Create a new repository on GitHub and push this project:
   ```bash
   git init
   git add -A
   git commit -m "Learn English Vite + React app"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git branch -M main
   git push -u origin main
   ```
2. In [vercel.com](https://vercel.com):
   - Click **Add New Project** &rarr; Select your new GitHub repo.
   - Vercel automatically detects **Framework Preset: Vite**, **Build Command: `vite build`**, **Output Directory: `dist`**.
   - Add Environment Variables:
     - `VITE_SUPABASE_URL`: Your Supabase Project URL
     - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key
     - `VITE_GEMINI_API_KEY`: Your Google Gemini API Key
   - Click **Deploy**!

---

## Accounts & Roles

- **Super Admin**:
  - Email: `star@gmail.com`
  - Password: `asdasd` (or whatever set in `users` table)
  - Role: `2` (Cannot be deleted or modified; exclusive access to manage staff admins at `/admin/admins`).
- **Staff Admin**:
  - Role: `1` (Access to create/edit/delete lessons, topics, and manage students).
- **Student**:
  - Role: `0` (Can mark lessons complete, add private notes, ask AI tutor, participate in comments).
