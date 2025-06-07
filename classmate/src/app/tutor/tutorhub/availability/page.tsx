'use client'

import { useEffect, useState } from 'react'
import { auth, db } from '@/lib/firebase'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'

export default function TutorAvailabilityPage() {
  const router = useRouter()
  const [schoolId, setSchoolId] = useState('')
  const [uid, setUid] = useState('')
  const [loading, setLoading] = useState(true)

  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [availability, setAvailability] = useState<any[]>([])

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

      setUid(user.uid)
      setSchoolId(school)
      setLoading(false)

      // Load existing availability
      const slotsSnap = await getDocs(collection(db, 'schools', school, 'tutors', user.uid, 'availability'))
      const slots = slotsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }))
      setAvailability(slots)
    })

    return () => unsub()
  }, [])

  const handleAddSlot = async () => {
    if (!startTime || !endTime || !schoolId || !uid) return

    const start = Timestamp.fromDate(new Date(startTime))
    const end = Timestamp.fromDate(new Date(endTime))

    if (start.toMillis() >= end.toMillis()) {
      alert('End time must be after start time.')
      return
    }

    await addDoc(collection(db, 'schools', schoolId, 'tutors', uid, 'availability'), {
      startTime: start,
      endTime: end,
      isBooked: false,
      createdAt: serverTimestamp(),
    })

    setStartTime('')
    setEndTime('')

    // Reload
    const slotsSnap = await getDocs(collection(db, 'schools', schoolId, 'tutors', uid, 'availability'))
    const slots = slotsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }))
    setAvailability(slots)
  }

  const handleDeleteSlot = async (id: string) => {
    await deleteDoc(doc(db, 'schools', schoolId, 'tutors', uid, 'availability', id))
    setAvailability((prev) => prev.filter((a) => a.id !== id))
  }

  if (loading) return <p className="text-white p-6">Loading...</p>

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">📅 Set Your Availability</h1>

      <div className="space-y-4 max-w-md">
        <div>
          <label className="block mb-1 text-sm">Start Time:</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="bg-gray-800 text-white p-2 rounded w-full"
          />
        </div>

        <div>
          <label className="block mb-1 text-sm">End Time:</label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="bg-gray-800 text-white p-2 rounded w-full"
          />
        </div>

        <button
          onClick={handleAddSlot}
          className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
        >
          ➕ Add Availability Slot
        </button>
      </div>

      <h2 className="text-xl font-semibold mt-10 mb-3">Your Current Availability</h2>

      {availability.length === 0 ? (
        <p className="text-gray-400">No availability set.</p>
      ) : (
        <ul className="space-y-3 mt-2">
          {availability.map((slot) => (
            <li
              key={slot.id}
              className="bg-gray-800 p-4 rounded flex items-center justify-between"
            >
              <div>
                <p>
                  🕒{' '}
                  {new Date(slot.startTime.seconds * 1000).toLocaleString()} -{' '}
                  {new Date(slot.endTime.seconds * 1000).toLocaleString()}
                </p>
                {slot.isBooked && (
                  <p className="text-yellow-400 text-sm">Booked by: {slot.bookedBy}</p>
                )}
              </div>
              {!slot.isBooked && (
                <button
                  onClick={() => handleDeleteSlot(slot.id)}
                  className="bg-red-600 px-3 py-1 rounded hover:bg-red-700 text-sm"
                >
                  ❌ Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
