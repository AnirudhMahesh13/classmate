'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

export default function AddProfessorPage() {
  const router = useRouter()

  const [schoolId, setSchoolId] = useState('')
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('')
  const [bio, setBio] = useState('')

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
    })

    return () => unsub()
  }, [])

  const handleSubmit = async (e: any) => {
    e.preventDefault()

    await addDoc(collection(db, 'schools', schoolId, 'pendingProfessors'), {
      name,
      department,
      bio,
      createdAt: serverTimestamp(),
      submittedBy: auth.currentUser?.uid || null
    })

    router.push('/professors')
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold mb-6">👨‍🏫 Submit a New Professor</h1>

      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 bg-gray-800 rounded"
          required
        />

        <input
          type="text"
          placeholder="Department"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="w-full p-3 bg-gray-800 rounded"
        />

        <textarea
          placeholder="Bio / Teaching Info"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="w-full p-3 bg-gray-800 rounded h-32"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 transition py-3 rounded font-semibold"
        >
          Submit Professor
        </button>
      </form>
    </div>
  )
}
