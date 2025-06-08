'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  collection
} from 'firebase/firestore'

export default function BookingSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    const slotId = searchParams.get('slotId')
    const tutorId = searchParams.get('tutorId')
    const studentId = searchParams.get('studentId')
    const schoolId = 'Carleton' // Replace with dynamic value if needed

    if (!slotId || !tutorId || !studentId) return

    const finalizeBooking = async () => {
      try {
        const slotRef = doc(db, 'schools', schoolId, 'tutors', tutorId, 'availability', slotId)
        const slotSnap = await getDoc(slotRef)

        if (!slotSnap.exists()) throw new Error('Slot does not exist')
        const slotData = slotSnap.data()

        // Step 1: Mark slot as booked
        await updateDoc(slotRef, {
          isBooked: true,
          bookedBy: studentId
        })

        // Step 2: Create session document
        await addDoc(collection(db, 'schools', schoolId, 'sessions'), {
          tutorId,
          studentId,
          slotId,
          startTime: slotData.startTime,
          endTime: slotData.endTime,
          createdAt: serverTimestamp()
        })

        setConfirmed(true)

        setTimeout(() => {
          router.replace('/dashboard/sessions?booked=true')
        }, 2500)
      } catch (err) {
        console.error('Booking failed:', err)
      }
    }

    finalizeBooking()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        {confirmed ? (
          <>
            <h1 className="text-4xl font-bold mb-2">✅ Booking Confirmed!</h1>
            <p className="text-lg text-gray-400">Redirecting to your dashboard...</p>
          </>
        ) : (
          <p className="text-lg">Finalizing your booking with the tutor...</p>
        )}
      </div>
    </div>
  )
}
