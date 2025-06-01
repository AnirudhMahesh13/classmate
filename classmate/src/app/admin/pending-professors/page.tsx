'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import {
  collection,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

export default function PendingProfessorsPage() {
  const router = useRouter()
  const [schoolId, setSchoolId] = useState('')
  const [pending, setPending] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      const userRef = doc(db, 'users', user.uid)
      const userSnap = await getDoc(userRef)

      if (!userSnap.exists()) {
        router.push('/login')
        return
      }

      const userData = userSnap.data()
      const school = userData.school
      const isAdmin = userData.role === 'admin'

      if (!school || !isAdmin) {
        router.push('/')
        return
      }

      setSchoolId(school)

      const snap = await getDocs(collection(db, 'schools', school, 'pendingProfessors'))
      const pendingList = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))
      setPending(pendingList)
      setLoading(false)
    })

    return () => unsub()
  }, [])

  const approveProfessor = async (prof: any) => {
    const profRef = doc(db, 'schools', schoolId, 'professors', prof.id)
    await setDoc(profRef, {
      name: prof.name,
      department: prof.department || '',
      bio: prof.bio || '',
      createdAt: serverTimestamp(),
      approvedBy: auth.currentUser?.uid || null
    })

    await deleteDoc(doc(db, 'schools', schoolId, 'pendingProfessors', prof.id))
    setPending((prev) => prev.filter((p) => p.id !== prof.id))
  }

  const rejectProfessor = async (id: string) => {
    await deleteDoc(doc(db, 'schools', schoolId, 'pendingProfessors', id))
    setPending((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-6">🧾 Pending Professors</h1>

      {loading ? (
        <p>Loading pending professors...</p>
      ) : pending.length === 0 ? (
        <p>No pending professor submissions.</p>
      ) : (
        <ul className="space-y-4">
          {pending.map((prof) => (
            <li key={prof.id} className="bg-gray-800 p-4 rounded space-y-2">
              <p className="text-lg font-semibold">{prof.name}</p>
              {prof.department && <p>Dept: {prof.department}</p>}
              {prof.bio && <p className="text-sm text-gray-300">{prof.bio}</p>}

              <div className="flex space-x-3 mt-2">
                <button
                  onClick={() => approveProfessor(prof)}
                  className="bg-green-600 hover:bg-green-700 px-4 py-1 rounded text-sm"
                >
                  ✅ Approve
                </button>
                <button
                  onClick={() => rejectProfessor(prof.id)}
                  className="bg-red-600 hover:bg-red-700 px-4 py-1 rounded text-sm"
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
