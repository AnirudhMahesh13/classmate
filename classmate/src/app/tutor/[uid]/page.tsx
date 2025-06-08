'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  serverTimestamp,
  addDoc
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

export default function TutorProfilePage() {
  const { uid } = useParams()
  const router = useRouter()

  const [school, setSchool] = useState('')
  const [tutor, setTutor] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState<number>(0)
  const [comment, setComment] = useState('')
  const [reviews, setReviews] = useState<any[]>([])
  const [myReview, setMyReview] = useState<any>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      const userRef = doc(db, 'users', user.uid)
      const userSnap = await getDoc(userRef)
      const schoolId = userSnap.data()?.school

      if (!schoolId) {
        router.push('/school')
        return
      }

      setSchool(schoolId)

      const tutorRef = doc(db, 'schools', schoolId, 'tutors', uid as string)
      const tutorSnap = await getDoc(tutorRef)

      if (!tutorSnap.exists()) {
        router.push('/tutor')
        return
      }

      const data = tutorSnap.data()
      setTutor({ id: tutorSnap.id, ...data })
      setLoading(false)

      const reviewSnap = await getDocs(collection(db, 'schools', schoolId, 'tutors', uid as string, 'reviews'))

      const reviewList = reviewSnap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      }))

      setReviews(reviewList)

      const mine = reviewList.find(r => r.uid === user.uid)
      if (mine) {
        setMyReview(mine)
        setRating(mine.rating)
        setComment(mine.comment)
      }
    })

    return () => unsubscribe()
  }, [uid])

  const handleSubmitReview = async () => {
    const user = auth.currentUser
    if (!user || !school || !uid) return

    const reviewRef = doc(db, 'schools', school, 'tutors', uid as string, 'reviews', user.uid)
    await setDoc(reviewRef, {
      uid: user.uid,
      name: user.displayName || user.email,
      rating,
      comment,
      createdAt: serverTimestamp(),
    })

    const reviewSnap = await getDocs(collection(db, 'schools', school, 'tutors', uid as string, 'reviews'))
    const all = reviewSnap.docs.map(d => d.data().rating)
    const avg = all.reduce((a, b) => a + b, 0) / all.length

    await updateDoc(doc(db, 'schools', school, 'tutors', uid as string), {
      avgRating: parseFloat(avg.toFixed(1)),
      ratingCount: all.length,
    })

    setMyReview({ uid: user.uid, name: user.displayName || user.email, rating, comment })
    setReviews((prev) => {
      const others = prev.filter(r => r.uid !== user.uid)
      return [...others, { uid: user.uid, name: user.displayName || user.email, rating, comment }]
    })
  }

  if (loading) return <p className="text-white p-6">Loading tutor...</p>

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 space-y-6">
      <h1 className="text-3xl font-bold">{tutor.name}</h1>
      {tutor.specialty && <p>Specialty: {tutor.specialty}</p>}
      {tutor.bio && <p className="text-gray-300">{tutor.bio}</p>}
      <p>⭐ Rating: {tutor.avgRating || 'N/A'} ({tutor.ratingCount || 0} reviews)</p>
      {tutor.rate && <p>💵 Rate: ${tutor.rate.toFixed(2)}</p>}

      <div className="bg-gray-800 p-4 rounded mt-4">
        <h2 className="text-xl font-semibold mb-2">Leave a Review</h2>

        <label className="block mb-1">Your Rating (1-5):</label>
        <input
          type="number"
          value={rating}
          onChange={(e) => setRating(parseInt(e.target.value))}
          min={1}
          max={5}
          className="bg-gray-700 p-2 rounded w-20 mb-3"
        />

        <label className="block mb-1">Your Comment:</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="bg-gray-700 p-2 rounded w-full h-24"
        />

        <button onClick={handleSubmitReview} className="mt-3 bg-green-600 px-4 py-2 rounded hover:bg-green-700">
          {myReview ? 'Update Review' : 'Submit Review'}
        </button>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">📝 Reviews</h2>
        {reviews.length === 0 ? (
          <p>No reviews yet.</p>
        ) : (
          <ul className="space-y-4">
            {reviews.map((r) => (
              <li key={r.uid} className="bg-gray-800 p-3 rounded">
                <p className="font-semibold">{r.name}</p>
                <p>⭐ {r.rating}</p>
                <p className="text-gray-300">{r.comment}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-3">📅 Available Sessions</h2>
        {school && tutor && (
          <AvailableSlotsSection
            schoolId={school}
            tutorId={tutor.id}
            tutorRate={tutor.rate}
          />
        )}
      </div>
    </div>
  )
}

function AvailableSlotsSection({
  schoolId,
  tutorId,
  tutorRate
}: {
  schoolId: string
  tutorId: string
  tutorRate: number
}) {
  const [slots, setSlots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSlots = async () => {
    const snap = await getDocs(collection(db, 'schools', schoolId, 'tutors', tutorId, 'availability'))
    const now = Date.now()
    const data = snap.docs
      .map(doc => ({ id: doc.id, ...(doc.data() as any) }))
      .filter(slot =>
        !slot.isBooked &&
        slot.startTime?.seconds * 1000 > now
      )

    setSlots(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchSlots()
  }, [])

  const handleBookSlot = async (slot: any) => {
    const user = auth.currentUser
    if (!user || !tutorRate) return

    // 🔒 Check latest slot state before proceeding
    const slotRef = doc(db, 'schools', schoolId, 'tutors', tutorId, 'availability', slot.id)
    const latestSnap = await getDoc(slotRef)

    if (!latestSnap.exists()) {
      alert('This slot no longer exists.')
      return
    }

    const latest = latestSnap.data()
    if (latest.isBooked) {
      alert('Sorry, this slot has already been booked.')
      fetchSlots() // refresh list
      return
    }

    // ✅ Proceed to Stripe checkout
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slot,
        tutorId,
        studentId: user.uid,
        rate: tutorRate
      })
    })

    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      alert('Failed to create Stripe session.')
    }
  }


  if (loading) return <p>Loading available sessions...</p>

  if (slots.length === 0) return <p className="text-gray-400">No available time slots.</p>

  return (
    <ul className="space-y-4">
      {slots.map((slot) => (
        <li key={slot.id} className="bg-gray-800 p-4 rounded flex justify-between items-center">
          <div>
            <p>
              🕒{' '}
              {new Date(slot.startTime.seconds * 1000).toLocaleString()} -{' '}
              {new Date(slot.endTime.seconds * 1000).toLocaleString()}
            </p>
          </div>
          <button
            onClick={() => handleBookSlot(slot)}
            className="bg-green-600 px-4 py-2 rounded hover:bg-green-700 text-sm"
          >
            Book (${tutorRate.toFixed(2)})
          </button>
        </li>
      ))}
    </ul>
  )
}
