'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'

const schools = ['Carleton', 'University of Toronto', 'McGill', 'Waterloo', 'Western']

export default function SelectSchoolPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login')
      } else {
        const ref = doc(db, 'users', user.uid)
        const snap = await getDoc(ref)

        if (snap.exists() && snap.data().school) {
          router.push('/dashboard')
        } else {
          setLoading(false)
        }
      }
    })

    return () => unsub()
  }, [])

  const handleSelect = async (school: string) => {
    const user = auth.currentUser
    if (!user) return

    const ref = doc(db, 'users', user.uid)
    await updateDoc(ref, { school })
    router.push('/dashboard')
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white bg-black">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">🎓 Select your school</h1>
      <ul className="flex flex-col gap-3">
        {schools.map((school) => (
          <li key={school}>
            <button
              onClick={() => handleSelect(school)}
              className="bg-blue-600 px-6 py-2 rounded hover:bg-blue-700 transition"
            >
              {school}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
