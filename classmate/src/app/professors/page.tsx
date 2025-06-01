'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import Link from 'next/link'

export default function ProfessorsPage() {
  const router = useRouter()
  const [schoolId, setSchoolId] = useState('')
  const [professors, setProfessors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

      const profSnap = await getDocs(collection(db, 'schools', school, 'professors'))
      const profList = profSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      setProfessors(profList)
      setLoading(false)
    })

    return () => unsub()
  }, [])

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">👨‍🏫 Professors</h1>

      {loading ? (
        <p>Loading professors...</p>
      ) : professors.length === 0 ? (
        <p>No professors found.</p>
      ) : (
        <ul className="space-y-4 mb-6">
          {professors.map((prof) => (
            <li key={prof.id} className="bg-gray-800 p-4 rounded shadow">
              <Link href={`/professors/${prof.id}`} className="text-xl font-semibold hover:underline">
                {prof.name}
              </Link>
              <p className="text-gray-400">{prof.department}</p>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => router.push('/professors/add')}
        className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
      >
        + Add Professor
      </button>
    </div>
  )
}
