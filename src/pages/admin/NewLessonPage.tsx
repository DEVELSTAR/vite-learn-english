import React from "react"
import { useLocation } from "react-router-dom"
import LessonForm from "../../components/admin/LessonForm"

export default function NewLessonPage() {
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const typeParam = queryParams.get("type")
  const lessonType = typeParam === "foundational_topic" ? 1 : 0

  return (
    <LessonForm
      initialLesson={{
        lesson_type: lessonType,
        lesson_date: new Date().toISOString().split("T")[0],
        status: 0,
      }}
      isEditing={false}
    />
  )
}

