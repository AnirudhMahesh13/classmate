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
      <h1 className="text-3xl font-bold mb-8">🛠 Admin Dashboard</h1>

      <div className="space-y-6">
        <Link href="/admin/pending-courses">
          <div className="bg-gray-800 hover:bg-gray-700 p-6 rounded shadow cursor-pointer">
            <h2 className="text-xl font-semibold">📄 Review Pending Courses</h2>
            <p className="text-gray-400">Approve or reject new course submissions.</p>
          </div>
        </Link>

        <Link href="/admin/pending-professors">
          <div className="bg-gray-800 hover:bg-gray-700 p-6 rounded shadow cursor-pointer">
            <h2 className="text-xl font-semibold">👨‍🏫 Review Pending Professors</h2>
            <p className="text-gray-400">Approve or reject new professor submissions.</p>
          </div>
        </Link>

        <Link href="/admin/pending-tutors">
          <div className="bg-gray-800 hover:bg-gray-700 p-6 rounded shadow cursor-pointer">
            <h2 className="text-xl font-semibold">📥 Review Pending Tutors</h2>
            <p className="text-gray-400">Approve or reject tutor applications.</p>
          </div>
        </Link>

        <Link href="/admin/manage-courses">
          <div className="bg-gray-800 hover:bg-gray-700 p-6 rounded shadow cursor-pointer">
            <h2 className="text-xl font-semibold">🧾 Manage Courses</h2>
            <p className="text-gray-400">Edit or delete existing courses.</p>
          </div>
        </Link>

        <Link href="/admin/manage-professors">
          <div className="bg-gray-800 hover:bg-gray-700 p-6 rounded shadow cursor-pointer">
            <h2 className="text-xl font-semibold">👥 Manage Professors</h2>
            <p className="text-gray-400">Edit or delete professors.</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
