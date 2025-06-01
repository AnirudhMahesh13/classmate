'use client'

import { useEffect, useState } from 'react'
import { auth, db } from '@/lib/firebase'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'

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
      const courseList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
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
            <li key={course.id} className="bg-gray-800 p-4 rounded shadow">
              <h2 className="text-xl font-semibold">{course.name}</h2>
              {course.professors && (
                <p className="text-sm text-gray-300">
                  Professors: {course.professors.join(', ')}
                </p>
              )}
            </li>
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
