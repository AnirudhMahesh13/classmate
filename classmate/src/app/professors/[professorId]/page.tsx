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
  serverTimestamp
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

export default function ProfessorProfilePage() {
  const { professorId } = useParams()
  const router = useRouter()

  const [school, setSchool] = useState('')
  const [professor, setProfessor] = useState<any>(null)
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

      const profRef = doc(db, 'schools', schoolId, 'professors', professorId as string)
      const profSnap = await getDoc(profRef)

      if (!profSnap.exists()) {
        router.push('/professors')
        return
      }

      const data = profSnap.data()
      setProfessor({ id: profSnap.id, ...data })
      setLoading(false)

      // Load reviews
      const reviewSnap = await getDocs(collection(db, 'schools', schoolId, 'professors', professorId as string, 'reviews'))
      type Review = {
        id: string
        uid: string
        name: string
        rating: number
        comment: string
      }

      const reviewList: Review[] = reviewSnap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Review, 'id'>)
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
  }, [professorId])

  const handleSubmitReview = async () => {
    const user = auth.currentUser
    if (!user || !school || !professorId) return

    const reviewRef = doc(db, 'schools', school, 'professors', professorId as string, 'reviews', user.uid)
    await setDoc(reviewRef, {
      uid: user.uid,
      name: user.displayName || user.email,
      rating,
      comment,
      createdAt: serverTimestamp(),
    })

    const reviewSnap = await getDocs(collection(db, 'schools', school, 'professors', professorId as string, 'reviews'))
    const all = reviewSnap.docs.map(d => d.data().rating)
    const avg = all.reduce((a, b) => a + b, 0) / all.length

    await updateDoc(doc(db, 'schools', school, 'professors', professorId as string), {
      avgRating: parseFloat(avg.toFixed(1)),
      ratingCount: all.length,
    })

    setMyReview({ uid: user.uid, name: user.displayName || user.email, rating, comment })
    setReviews((prev) => {
      const others = prev.filter(r => r.uid !== user.uid)
      return [...others, { uid: user.uid, name: user.displayName || user.email, rating, comment }]
    })
  }

  if (loading) return <p className="text-white p-6">Loading professor...</p>

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 space-y-6">
      <h1 className="text-3xl font-bold">{professor.name}</h1>
      {professor.department && <p>Department: {professor.department}</p>}
      {professor.bio && <p className="text-gray-300">{professor.bio}</p>}
      <p>⭐ Rating: {professor.avgRating || 'N/A'} ({professor.ratingCount || 0} reviews)</p>

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
    </div>
  )
}
