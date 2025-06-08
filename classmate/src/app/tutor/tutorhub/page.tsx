'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'

export default function TutorPage() {
  const [isTutor, setIsTutor] = useState(false)
  const [schoolId, setSchoolId] = useState('')
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      const userSnap = await getDoc(doc(db, 'users', user.uid))
      const userData = userSnap.data()
      if (!userData?.school) {
        router.push('/school')
        return
      }

      setSchoolId(userData.school)
      setUserId(user.uid)

      const tutorSnap = await getDoc(doc(db, 'schools', userData.school, 'tutors', user.uid))
      setIsTutor(tutorSnap.exists())

      setLoading(false)
    })

    return () => unsub()
  }, [])

  if (loading) return <div className="p-8 text-white">Loading...</div>

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">🎓 Tutor Hub</h1>

      <p className="mb-4 text-gray-300">
        Welcome to the Tutor Hub. From here, you can {isTutor ? 'manage your profile and sessions' : 'apply to become a tutor'}.
      </p>

      <div className="space-y-4">
        {!isTutor ? (
          <Link
            href="/tutor/tutorhub/apply"
            className="block bg-green-600 px-4 py-3 rounded hover:bg-green-700 w-full max-w-sm"
          >
            📝 Apply to Become a Tutor
          </Link>
        ) : (
          <>
            <Link
              href="/tutor/tutorhub/profile"
              className="block bg-blue-600 px-4 py-3 rounded hover:bg-blue-700 w-full max-w-sm"
            >
              📄 View/Edit Tutor Profile
            </Link>

            <Link
              href="/tutor/tutorhub/sessions"
              className="block bg-purple-600 px-4 py-3 rounded hover:bg-purple-700 w-full max-w-sm"
            >
              👨‍🏫👩‍🎓 Manage Tutoring Sessions
            </Link>

            <Link
              href="/tutor/tutorhub/availability"
              className="block bg-yellow-600 px-4 py-3 rounded hover:bg-yellow-700 w-full max-w-sm"
            >
              📅 Manage Tutoring Availability
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
