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
      const now = Date.now()
      const mySessions = snap.docs
        .map(d => ({ id: d.id, ...(d.data() as any) }))
        .filter(session =>
          session.studentId === user.uid &&
          session.startTime?.seconds &&
          session.endTime?.seconds &&
          session.startTime.seconds * 1000 > now
        )

      const enriched = await Promise.all(mySessions.map(async (s) => {
        const tutorSnap = await getDoc(doc(db, 'users', s.tutorId))
        const tutor = tutorSnap.exists() ? tutorSnap.data() : {}
        return {
          ...s,
          tutorName: tutor.displayName || tutor.email || 'Unknown Tutor',
          tutorEmail: tutor.email || '',
        }
      }))

      setSessions(enriched.sort((a, b) => a.startTime.seconds - b.startTime.seconds))
      setLoading(false)
    })

    return () => unsub()
  }, [])

  const handleCancel = async (session: any) => {
    const studentSnap = await getDoc(doc(db, 'users', studentId))
    const student = studentSnap.data()

    // 1. Unbook the slot
    await updateDoc(doc(db, 'schools', schoolId, 'tutors', session.tutorId, 'availability', session.slotId), {
      isBooked: false,
      bookedBy: null
    })

    // 2. Delete the session
    await deleteDoc(doc(db, 'schools', schoolId, 'sessions', session.id))

    // 3. Email both parties
    await fetch('/api/email/send-cancellation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tutorEmail: session.tutorEmail,
        studentEmail: student?.email,
        tutorName: session.tutorName,
        studentName: student?.displayName || student?.email,
        startTime: session.startTime,
        endTime: session.endTime,
        cancelledBy: 'student'
      })
    })

    // 4. Refund the session
    await fetch('/api/stripe/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stripeSessionId: session.stripeSessionId
      })
    })

    // 5. Update local state
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
            <li key={s.id} className="bg-gray-900 border border-gray-700 p-4 rounded shadow-sm hover:bg-gray-800 transition-all flex justify-between items-center">
              <div>
                <p className="text-lg font-semibold mb-1 text-white">
                  🕒 {new Date(s.startTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(s.endTime.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  <span className="ml-1 text-sm text-gray-400">
                    on {new Date(s.startTime.seconds * 1000).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </p>
                <p className="text-sm text-gray-400">🧑‍🏫 {s.tutorName}</p>
              </div>
              <button
                onClick={() => handleCancel(s)}
                className="bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition-colors duration-200 text-sm font-medium"
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
