'use client'

import { useEffect, useState } from 'react'
import { auth, db } from '@/lib/firebase'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import Link from 'next/link'

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [schoolId, setSchoolId] = useState('')
  const [userChecked, setUserChecked] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/')
        return
      }

      const userRef = doc(db, 'users', user.uid)
      const userSnap = await getDoc(userRef)
      const school = userSnap.data()?.school

      if (!school) {
        router.push('/school')
        return
      }

      setSchoolId(school)

      const courseCol = collection(db, 'schools', school, 'courses')
      const snapshot = await getDocs(courseCol)
      const rawCourses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      }))

      const allProfIds = new Set<string>()
      rawCourses.forEach(course => {
        if (Array.isArray(course.professors)) {
          course.professors.forEach((pid: string) => allProfIds.add(pid))
        }
      })

      const profSnaps = await Promise.all(
        Array.from(allProfIds).map((id) =>
          getDoc(doc(db, 'schools', school, 'professors', id))
        )
      )

      const profMap: Record<string, string> = {}
      profSnaps.forEach(snap => {
        if (snap.exists()) {
          profMap[snap.id] = snap.data().name
        }
      })

      const courseList = rawCourses.map(course => ({
        ...course,
        professorNames: (course.professors || []).map((id: string) => profMap[id] || 'Unknown')
      }))

      setCourses(courseList)
      setLoading(false)
      setUserChecked(true)
    })

    return () => unsubscribe()
  }, [])

  if (!userChecked) {
    return <div className="text-white p-6">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Courses at {schoolId}</h1>

      {loading ? (
        <p>Loading...</p>
      ) : courses.length === 0 ? (
        <p>No courses yet. Click below to add one.</p>
      ) : (
        <ul className="space-y-3">
          {courses.map(course => (
            <Link href={`/courses/${course.id}`} key={course.id} passHref>
              <li className="bg-gray-800 p-4 rounded shadow hover:bg-gray-700 cursor-pointer transition">
                <h2 className="text-xl font-semibold">{course.name}</h2>
                {course.professorNames && course.professorNames.length > 0 && (
                  <p className="text-sm text-gray-300">
                    Professors: {course.professorNames.join(', ')}
                  </p>
                )}
              </li>
            </Link>
          ))}
        </ul>
      )}

      <button
        onClick={() => router.push('/courses/add')}
        className="mt-8 bg-green-600 px-4 py-2 rounded hover:bg-green-700"
      >
        + Add Course
      </button>
    </div>
  )
}
