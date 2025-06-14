'use client'

import { Calendar, dateFnsLocalizer, SlotInfo } from 'react-big-calendar'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { useEffect, useState } from 'react'
import { auth, db } from '@/lib/firebase'
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

type Event = {
  id: string
  title: string
  start: Date
  end: Date
  resource: any
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { 'en-US': enUS },
})

export default function MySessionsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [schoolId, setSchoolId] = useState('')
  const [tutorId, setTutorId] = useState('')
  const [rate, setRate] = useState<number>(0)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return

      const userSnap = await getDoc(doc(db, 'users', user.uid))
      const school = userSnap.data()?.school
      setTutorId(user.uid)
      setSchoolId(school)

      const tutorDoc = await getDoc(doc(db, 'schools', school, 'tutors', user.uid))
      const tutorRate = tutorDoc.data()?.rate || 0
      setRate(tutorRate)

      await loadEvents(user.uid, school)
    })

    return () => unsub()
  }, [])

  const loadEvents = async (uid: string, school: string) => {
    const availabilitySnap = await getDocs(
      collection(db, 'schools', school, 'tutors', uid, 'availability')
    )
    const availability = availabilitySnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    const sessionSnap = await getDocs(collection(db, 'schools', school, 'sessions'))
    const sessions = sessionSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((s: any) => s.tutorId === uid)

    const enhanced = await Promise.all(
      sessions.map(async (s: any) => {
        const studentDoc = await getDoc(doc(db, 'users', s.studentId))
        const student = studentDoc.data()
        return {
          ...s,
          studentName: student?.displayName || student?.email || 'Student',
        }
      })
    )

    const events: Event[] = [
      ...availability
        .filter((a: any) => !a.isBooked)
        .map((a: any) => ({
          id: a.id,
          title: '🟢 Available',
          start: new Date(a.startTime.seconds * 1000),
          end: new Date(a.endTime.seconds * 1000),
          resource: { type: 'availability' },
        })),
      ...enhanced.map((s: any) => ({
        id: s.id,
        title: `📘 Session: ${s.studentName}`,
        start: new Date(s.startTime.seconds * 1000),
        end: new Date(s.endTime.seconds * 1000),
        resource: { type: 'session', session: s },
      })),
    ]

    setEvents(events)
  }

  const handleSelectSlot = async (slotInfo: SlotInfo) => {
    if (!tutorId || !schoolId) return

    const overlap = events.some(
      (e) =>
        (slotInfo.start < e.end && slotInfo.end > e.start) &&
        e.resource.type === 'availability'
    )
    if (overlap) return alert('Slot overlaps with existing availability.')

    const ref = await addDoc(
      collection(db, 'schools', schoolId, 'tutors', tutorId, 'availability'),
      {
        startTime: Timestamp.fromDate(slotInfo.start),
        endTime: Timestamp.fromDate(slotInfo.end),
        isBooked: false,
        createdAt: serverTimestamp(),
      }
    )

    setEvents((prev) => [
      ...prev,
      {
        id: ref.id,
        title: '🟢 Available',
        start: slotInfo.start,
        end: slotInfo.end,
        resource: { type: 'availability' },
      },
    ])
  }

  const handleSelectEvent = async (e: Event) => {
    if (e.resource.type === 'availability') {
      if (!confirm('Delete this availability?')) return
      await deleteDoc(doc(db, 'schools', schoolId, 'tutors', tutorId, 'availability', e.id))
      setEvents((prev) => prev.filter((ev) => ev.id !== e.id))
    }

    if (e.resource.type === 'session') {
      const s = e.resource.session
      if (!confirm(`Cancel session with ${s.studentName}? This will trigger a refund.`)) return

      await updateDoc(doc(db, 'schools', schoolId, 'tutors', tutorId, 'availability', s.slotId), {
        isBooked: false,
        bookedBy: null,
      })

      const [studentSnap, tutorSnap] = await Promise.all([
        getDoc(doc(db, 'users', s.studentId)),
        getDoc(doc(db, 'users', s.tutorId)),
      ])

      const student = studentSnap.data()
      const tutor = tutorSnap.data()

      await fetch('/api/email/send-cancellation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutorEmail: tutor.email,
          studentEmail: student.email,
          tutorName: tutor.displayName || tutor.email,
          studentName: student.displayName || student.email,
          startTime: s.startTime,
          endTime: s.endTime,
          cancelledBy: 'Tutor',
        }),
      })

      await fetch('/api/stripe/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stripeSessionId: s.stripeSessionId }),
      })

      await deleteDoc(doc(db, 'schools', schoolId, 'sessions', s.id))
      loadEvents(tutorId, schoolId)
    }
  }

  return (
    <div className="p-6 bg-black min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-4">📅 Manage Availability & Sessions</h1>
      <Calendar
        localizer={localizer}
        events={events}
        defaultView="week"
        selectable
        step={30}
        timeslots={2}
        style={{ height: '80vh', backgroundColor: 'white', color: 'black', borderRadius: '10px' }}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
      />
    </div>
  )
}
