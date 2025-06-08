'use client'

import { useEffect, useState } from 'react'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import {
  doc,
  getDoc,
  updateDoc,
  arrayRemove
} from 'firebase/firestore'
import Link from 'next/link'

export default function DashboardPage() {
  const router = useRouter()
  const [name, setName] = useState<string | null>(null)
  const [school, setSchool] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [followedCourses, setFollowedCourses] = useState<any[]>([])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      const userRef = doc(db, 'users', user.uid)
      const userSnap = await getDoc(userRef)

      if (userSnap.exists()) {
        const data = userSnap.data()
        setName(data.name)
        setSchool(data.school)

        if (data.school && data.followedCourses?.length) {
          const coursePromises = data.followedCourses.map((courseId: string) =>
            getDoc(doc(db, 'schools', data.school, 'courses', courseId))
          )
          const courseSnaps = await Promise.all(coursePromises)
          const courseList = courseSnaps
            .filter((snap) => snap.exists())
            .map((snap) => ({ id: snap.id, ...snap.data() }))
          setFollowedCourses(courseList)
        }
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const unfollowCourse = async (courseId: string) => {
    const user = auth.currentUser
    if (!user || !school) return

    const courseRef = doc(db, 'schools', school, 'courses', courseId)
    await updateDoc(courseRef, {
      followers: arrayRemove(user.uid)
    })

    const userRef = doc(db, 'users', user.uid)
    await updateDoc(userRef, {
      followedCourses: arrayRemove(courseId)
    })

    setFollowedCourses((prev) => prev.filter((c) => c.id !== courseId))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p>Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 space-y-8">
      <h1 className="text-3xl font-bold">🎓 Welcome back, {name}!</h1>
      <h2 className="text-xl">🏫 Your school: {school}</h2>

      <div>
        <h3 className="text-2xl font-semibold mb-4">📚 Your Courses</h3>
        {followedCourses.length === 0 ? (
          <p>You haven’t followed any courses yet.</p>
        ) : (
          <ul className="space-y-3">
            {followedCourses.map((course) => (
              <li key={course.id} className="bg-gray-800 p-4 rounded shadow space-y-1">
                <Link href={`/courses/${course.id}`} className="text-lg font-semibold hover:underline">
                  {course.name}
                </Link>
                {course.professors && (
                  <p className="text-sm text-gray-400">
                    Professors: {course.professors.join(', ')}
                  </p>
                )}
                <button
                  onClick={() => unfollowCourse(course.id)}
                  className="mt-2 bg-red-600 px-3 py-1 text-sm rounded hover:bg-red-700"
                >
                  ❌ Unfollow
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-4">
        <button
          onClick={() => router.push('/dashboard/sessions')}
          className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          📅 View My Sessions
        </button>

        <button
          onClick={async () => {
            await auth.signOut()
            router.push('/login')
          }}
          className="bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
