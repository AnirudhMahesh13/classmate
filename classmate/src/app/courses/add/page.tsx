'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import {
  doc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import Link from 'next/link'

export default function AddCoursePage() {
  const router = useRouter()

  const [schoolId, setSchoolId] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [courseName, setCourseName] = useState('')
  const [professors, setProfessors] = useState('')
  const [courses, setCourses] = useState<any[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      const userRef = doc(db, 'users', user.uid)
      const userSnap = await getDoc(userRef)
      const school = userSnap.data()?.school

      if (!school) {
        router.push('/select-school')
        return
      }

      setSchoolId(school)

      const courseSnap = await getDocs(collection(db, 'schools', school, 'courses'))
      const list = courseSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setCourses(list)
      setLoadingCourses(false)
    })

    return () => unsub()
  }, [])

  const handleSubmit = async (e: any) => {
    e.preventDefault()

    const profArray = professors
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0)

    const docRef = await addDoc(collection(db, 'schools', schoolId, 'courses'), {
      code: courseCode,
      name: courseName,
      professors: profArray,
      followers: [],
      avgRating: null,
      ratingCount: 0,
      createdAt: serverTimestamp(),
      submittedBy: auth.currentUser?.uid || null,
      schoolId: schoolId,
    })

    router.push(`/courses/${docRef.id}`)
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-6 text-center">📚 Submit a New Course</h1>

      <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-4 mb-12">
        <input
          type="text"
          placeholder="Course Code (e.g., COMP 2404)"
          value={courseCode}
          onChange={(e) => setCourseCode(e.target.value)}
          className="w-full p-3 bg-gray-800 rounded"
          required
        />
        <input
          type="text"
          placeholder="Course Name"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          className="w-full p-3 bg-gray-800 rounded"
          required
        />
        <input
          type="text"
          placeholder="Professors (comma-separated)"
          value={professors}
          onChange={(e) => setProfessors(e.target.value)}
          className="w-full p-3 bg-gray-800 rounded"
        />
        <button
          type="submit"
          className="w-full bg-green-600 hover:bg-green-700 transition py-3 rounded font-semibold"
        >
          Submit Course
        </button>
      </form>

      <div className="max-w-3xl mx-auto">
        <h2 className="text-xl font-bold mb-4">📘 Existing Courses</h2>

        {loadingCourses ? (
          <p>Loading courses...</p>
        ) : courses.length === 0 ? (
          <p>No courses available.</p>
        ) : (
          <ul className="space-y-3">
            {courses.map((course) => (
              <li key={course.id}>
                <Link href={`/courses/${course.id}`} passHref legacyBehavior>
                  <a className="block bg-gray-800 p-4 rounded shadow hover:bg-gray-700 transition cursor-pointer">
                    <h3 className="text-lg font-semibold">{course.name}</h3>
                    <p className="text-gray-400">{course.code}</p>
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
