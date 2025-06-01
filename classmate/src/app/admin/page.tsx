'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import Link from 'next/link'

export default function AdminDashboard() {
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      const userRef = doc(db, 'users', user.uid)
      const userSnap = await getDoc(userRef)
      const userData = userSnap.data()

      if (userData?.role !== 'admin') {
        router.push('/dashboard')
      }
    })

    return () => unsubscribe()
  }, [])

  const linkClass =
    'block bg-gray-800 hover:bg-gray-700 p-4 rounded text-white font-semibold shadow transition'

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-8 text-center">🛠️ Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        <Link href="/admin/pending-professors" className={linkClass}>
          👩‍🏫 Review Pending Professors
        </Link>

        <Link href="/admin/pending-courses" className={linkClass}>
          📚 Review Pending Courses
        </Link>

        <Link href="/admin/manage-professors" className={linkClass}>
          📝 Manage Professors (Edit/Delete)
        </Link>

        <Link href="/admin/manage-courses" className={linkClass}>
          📝 Manage Courses (Edit/Delete)
        </Link>
      </div>
    </div>
  )
}
