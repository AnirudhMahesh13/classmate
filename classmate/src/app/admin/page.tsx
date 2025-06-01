'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import {
  collection,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  setDoc
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

export default function AdminPage() {
  const router = useRouter()
  const [pending, setPending] = useState<any[]>([])
  const [schoolId, setSchoolId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      const userRef = doc(db, 'users', user.uid)
      const userSnap = await getDoc(userRef)
      const data = userSnap.data()

      if (data?.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      const school = data.school
      setSchoolId(school)

      const col = collection(db, 'schools', school, 'pendingCourses')
      const snap = await getDocs(col)
      const pendingList = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      setPending(pendingList)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const approve = async (course: any) => {
    const id = course.code.replace(/\s+/g, '_').toLowerCase()

    await setDoc(doc(db, 'schools', schoolId, 'courses', id), {
      name: course.name,
      code: course.code,
      professors: course.professors || []
    })

    await deleteDoc(doc(db, 'schools', schoolId, 'pendingCourses', course.id))

    setPending(pending.filter(c => c.id !== course.id))
  }

  const reject = async (courseId: string) => {
    await deleteDoc(doc(db, 'schools', schoolId, 'pendingCourses', courseId))
    setPending(pending.filter(c => c.id !== courseId))
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">📋 Admin Panel – Pending Courses</h1>

      {loading ? (
        <p>Loading...</p>
      ) : pending.length === 0 ? (
        <p>No pending submissions.</p>
      ) : (
        <ul className="space-y-4">
          {pending.map(course => (
            <li key={course.id} className="bg-gray-800 p-4 rounded shadow">
              <h2 className="text-xl font-bold">{course.code}: {course.name}</h2>
              {course.professors?.length > 0 && (
                <p className="text-sm text-gray-300">Professors: {course.professors.join(', ')}</p>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => approve(course)}
                  className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
                >
                  ✅ Approve
                </button>
                <button
                  onClick={() => reject(course.id)}
                  className="bg-red-600 px-4 py-2 rounded hover:bg-red-700"
                >
                  ❌ Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
