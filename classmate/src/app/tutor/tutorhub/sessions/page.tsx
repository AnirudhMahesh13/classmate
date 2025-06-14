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

type Session = {
  id: string
  tutorId: string
  studentId: string
  slotId: string
  startTime: { seconds: number }
  endTime: { seconds: number }
  stripeSessionId: string // ✅ added
  studentName?: string
}

export default function TutorSessionsPage() {
  const router = useRouter()
  const [schoolId, setSchoolId] = useState('')
  const [tutorId, setTutorId] = useState('')
  const [sessions, setSessions] = useState<Session[]>([])
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
      setTutorId(user.uid)

      const snap = await getDocs(collection(db, 'schools', school, 'sessions'))

      const booked = snap.docs
        .map(d => {
          const data = d.data() as Omit<Session, 'id'>
          return {
            id: d.id,
            ...data
          }
        })
        .filter(session =>
          session.tutorId === user.uid &&
          session.startTime?.seconds &&
          session.endTime?.seconds &&
          session.studentId
        )

      const enhanced = await Promise.all(booked.map(async (s) => {
        const studentSnap = await getDoc(doc(db, 'users', s.studentId))
        const student = studentSnap.exists() ? studentSnap.data() : {}
        return {
          ...s,
          studentName: student.displayName || student.email || 'Unknown'
        }
      }))

      setSessions(enhanced.sort((a, b) => b.startTime.seconds - a.startTime.seconds))
      setLoading(false)
    })

    return () => unsub()
  }, [])

  const handleCancel = async (session: Session) => {
    try {
      await updateDoc(doc(db, 'schools', schoolId, 'tutors', tutorId, 'availability', session.slotId), {
        isBooked: false,
        bookedBy: null
      })

      const [studentSnap, tutorSnap] = await Promise.all([
        getDoc(doc(db, 'users', session.studentId)),
        getDoc(doc(db, 'users', session.tutorId)),
      ])

      const student = studentSnap.data()
      const tutor = tutorSnap.data()

      if (!student?.email || !tutor?.email) {
        throw new Error('Missing user email(s)')
      }

      await fetch('/api/email/send-cancellation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutorEmail: tutor.email,
          studentEmail: student.email,
          tutorName: tutor.displayName || tutor.email,
          studentName: student.displayName || student.email,
          startTime: session.startTime,
          endTime: session.endTime,
          cancelledBy: 'Tutor'
        })
      })

      await fetch('/api/stripe/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stripeSessionId: session.stripeSessionId }) // ✅ FIXED
      })

      await deleteDoc(doc(db, 'schools', schoolId, 'sessions', session.id))

      setSessions(prev => prev.filter(s => s.id !== session.id))
    } catch (err) {
      console.error('Tutor cancel error:', err)
    }
  }

  if (loading) return <p className="text-white p-6">Loading sessions...</p>

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-bold mb-6">📋 Your Booked Sessions</h1>

      {sessions.length === 0 ? (
        <p className="text-gray-400">No one has booked any sessions yet.</p>
      ) : (
        <ul className="space-y-4">
          {sessions.map((s) => (
            <li key={s.id} className="bg-gray-800 p-4 rounded flex justify-between items-center">
              <div>
                <p className="font-medium">
                  🕒{' '}
                  {new Date(s.startTime.seconds * 1000).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}{' '}
                  -{' '}
                  {new Date(s.endTime.seconds * 1000).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}{' '}
                  on{' '}
                  {new Date(s.startTime.seconds * 1000).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-300">👤 {s.studentName}</p>
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
