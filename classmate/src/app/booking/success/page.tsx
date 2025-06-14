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
    const stripeSessionId = searchParams.get('session_id')
    const schoolId = 'Carleton' // Replace with dynamic if needed

    //if (!slotId || !tutorId || !studentId || !stripeSessionId) return

    const finalizeBooking = async () => {
      try {
        const slotRef = doc(db, 'schools', schoolId, 'tutors', tutorId, 'availability', slotId)
        const slotSnap = await getDoc(slotRef)

        if (!slotSnap.exists()) throw new Error('Slot does not exist')
        const slotData = slotSnap.data()

        // 1. Mark slot as booked
        await updateDoc(slotRef, {
          isBooked: true,
          bookedBy: studentId
        })

        // 2. Create session (✅ Save Stripe session ID too)
        await addDoc(collection(db, 'schools', schoolId, 'sessions'), {
          tutorId,
          studentId,
          slotId,
          startTime: slotData.startTime,
          endTime: slotData.endTime,
          stripeSessionId: stripeSessionId,
          createdAt: serverTimestamp()
        })

        // 3. Fetch user info
        const [studentSnap, tutorUserSnap, tutorProfileSnap] = await Promise.all([
          getDoc(doc(db, 'users', studentId)),
          getDoc(doc(db, 'users', tutorId)),
          getDoc(doc(db, 'schools', schoolId, 'tutors', tutorId)),
        ])

        const studentData = studentSnap.data()
        const tutorUserData = tutorUserSnap.data()
        const tutorProfileData = tutorProfileSnap.data()

        if (!tutorUserData?.email || !studentData?.email) {
          throw new Error('Missing user email(s)')
        }

        const tutorRate = tutorProfileData?.rate || 0

        // 4. Send confirmation email
        await fetch('/api/email/send-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tutorEmail: tutorUserData.email,
            studentEmail: studentData.email,
            tutorName: tutorUserData.displayName || tutorUserData.email,
            studentName: studentData.displayName || studentData.email,
            startTime: slotData.startTime,
            endTime: slotData.endTime,
            rate: tutorRate,
          })
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
