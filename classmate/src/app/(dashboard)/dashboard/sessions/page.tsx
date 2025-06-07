'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

export default function StudentSessionsPage() {
  const router = useRouter()
  const [schoolId, setSchoolId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      const userSnap = await getDoc(doc(db, 'users', user.uid))
      const school = userSnap.data()?.school
      if (!school) {
        router.push('/school')
        return
      }

      setSchoolId(school)
      setStudentId(user.uid)

      const snap = await getDocs(collection(db, 'schools', school, 'sessions'))
      const mySessions = snap.docs
        .map(d => ({ id: d.id, ...(d.data() as any) }))
        .filter(session => session.studentId === user.uid)

      const enriched = await Promise.all(mySessions.map(async (s) => {
        const tutorSnap = await getDoc(doc(db, 'users', s.tutorId))
        const tutor = tutorSnap.exists() ? tutorSnap.data() : {}
        return {
          ...s,
          tutorName: tutor.displayName || tutor.email || 'Unknown Tutor'
        }
      }))

      setSessions(enriched)
      setLoading(false)
    })

    return () => unsub()
  }, [])

  const handleCancel = async (session: any) => {
    await updateDoc(doc(db, 'schools', schoolId, 'tutors', session.tutorId, 'availability', session.slotId), {
      isBooked: false,
      bookedBy: null
    })

    await deleteDoc(doc(db, 'schools', schoolId, 'sessions', session.id))

    setSessions((prev) => prev.filter(s => s.id !== session.id))
  }

  if (loading) return <p className="text-white p-6">Loading your sessions...</p>

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-bold mb-6">📅 Your Booked Sessions</h1>

      {sessions.length === 0 ? (
        <p className="text-gray-400">You haven’t booked any sessions yet.</p>
      ) : (
        <ul className="space-y-4">
          {sessions.map((s) => (
            <li key={s.id} className="bg-gray-800 p-4 rounded flex justify-between items-center">
              <div>
                <p>
                  🕒 {new Date(s.startTime.seconds * 1000).toLocaleString()} -{' '}
                  {new Date(s.endTime.seconds * 1000).toLocaleString()}
                </p>
                <p className="text-sm text-gray-300">🧑‍🏫 {s.tutorName}</p>
              </div>
              <button
                onClick={() => handleCancel(s)}
                className="bg-red-600 px-3 py-1 rounded hover:bg-red-700 text-sm"
              >
                Cancel
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
