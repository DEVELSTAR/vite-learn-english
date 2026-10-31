# Learn English - Daily Hinglish to Fluent English (Vite + React)

A lightning-fast web application designed to help learners in India bridge the gap between spoken Hindi/Hinglish and natural, confident English. Built as a Single-Page Application with **Vite, React, TypeScript, Tailwind CSS**, and powered by **PostgreSQL (Supabase)** and **Google Gemini 1.5 Flash**.

## Features

- **Daily Speaking Classes & Foundational Curriculum**:
  - Filter classes by date and category.
  - Step-by-step foundational grammar topics.
- **Permanently Open 3-in-1 Study Sidebar**:
  - **AI Tutor ("Ask Akib Sir")**: Real-time answers, examples, and tests via Google Gemini 1.5 Flash.
  - **Community Discussion**: Threaded questions and sentence sharing on `lesson_comments`.
  - **Personal Notes**: Private vocabulary and rule capture synced to `notes`.
  - *Layout*: Desktop right sidebar column, mobile bottom section (never blocks or minimizes!).
- **Progress Tracking**:
  - "Mark as Complete" and "Needs Revision" indicators synced to `lesson_completions`.
- **Dedicated Admin Control Center**:
  - Dedicated authentication at `/admin/login`.
  - CRUD for Daily Classes & Topics (with rich body stored in `action_text_rich_texts`).
  - Student Management (`users` table, `role: 0`).
  - Admin Management (exclusive to Super Admin `role: 2`, `star@gmail.com`).

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Configure Environment**:
   Copy `.env.example` to `.env` and fill in your Supabase & Gemini keys:
   ```bash
   cp .env.example .env
   ```
3. **Run Dev Server**:
   ```bash
   npm run dev
   ```
4. **Build for Production**:
   ```bash
   npm run build
   ```

## Deploying to Vercel

Push the project to GitHub and import it on Vercel. Vercel automatically detects the **Vite** preset and uses the provided `vercel.json` SPA rewrite rules.
