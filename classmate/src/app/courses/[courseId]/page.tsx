'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

export default function CoursePage() {
  const router = useRouter()
  const { courseId } = useParams()
  const [course, setCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState(false)
  const [school, setSchool] = useState('')
  const [reviews, setReviews] = useState<any[]>([])
  const [myReview, setMyReview] = useState<any>(null)

  const [rating, setRating] = useState<number>(0)
  const [comment, setComment] = useState('')

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

      const courseRef = doc(db, 'schools', schoolId, 'courses', courseId as string)
      const courseSnap = await getDoc(courseRef)
      if (!courseSnap.exists()) {
        router.push('/courses')
        return
      }

const data = courseSnap.data()

// Fetch professor names from IDs
let professorNames: string[] = []
if (Array.isArray(data.professors)) {
  const profSnaps = await Promise.all(
    data.professors.map((id: string) =>
      getDoc(doc(db, 'schools', schoolId, 'professors', id))
    )
  )
  professorNames = profSnaps
    .filter((snap) => snap.exists())
    .map((snap) => snap.data().name)
}

setCourse({ id: courseSnap.id, ...data, professorNames })
setFollowing(data.followers?.includes(user.uid))

      setLoading(false)

      // Load all reviews
      const reviewRef = collection(db, 'schools', schoolId, 'courses', courseId as string, 'reviews')
      const reviewSnap = await getDocs(reviewRef)
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

      // Find my review if exists
      const mine = reviewList.find(r => r.uid === user.uid)
      if (mine) {
        setMyReview(mine)
        setRating(mine.rating)
        setComment(mine.comment)
      }
    })

    return () => unsubscribe()
  }, [courseId])

  const handleSubmitReview = async () => {
    const user = auth.currentUser
    if (!user || !school || !courseId) return

    const reviewRef = doc(db, 'schools', school, 'courses', courseId as string, 'reviews', user.uid)
    await setDoc(reviewRef, {
      uid: user.uid,
      name: user.displayName || user.email,
      rating,
      comment,
      createdAt: serverTimestamp(),
    })

    // Recalculate avg rating
    const reviewSnap = await getDocs(collection(db, 'schools', school, 'courses', courseId as string, 'reviews'))
    const all = reviewSnap.docs.map(d => d.data().rating)
    const avg = all.reduce((a, b) => a + b, 0) / all.length
    const courseRef = doc(db, 'schools', school, 'courses', courseId as string)
    await updateDoc(courseRef, {
      avgRating: parseFloat(avg.toFixed(1)),
      ratingCount: all.length,
    })

    // Update UI
    setMyReview({ uid: user.uid, name: user.displayName || user.email, rating, comment })
    setReviews((prev) => {
      const others = prev.filter(r => r.uid !== user.uid)
      return [...others, { uid: user.uid, name: user.displayName || user.email, rating, comment }]
    })
  }

  const followCourse = async () => {
    const user = auth.currentUser
    if (!user || !course) return

    const courseRef = doc(db, 'schools', school, 'courses', course.id)
    await updateDoc(courseRef, {
      followers: arrayUnion(user.uid)
    })

    const userRef = doc(db, 'users', user.uid)
    await updateDoc(userRef, {
      followedCourses: arrayUnion(course.id)
    })

    setFollowing(true)
  }

  if (loading) return <p className="text-white p-6">Loading course...</p>

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 space-y-6">
      <h1 className="text-3xl font-bold">{course.name}</h1>

{course.professorNames && course.professorNames.length > 0 && (
  <p>Professors: {course.professorNames.join(', ')}</p>
)}


      <p className="text-gray-300">{course.description}</p>
      <p>Followers: {course.followers?.length || 0}</p>
      <p>⭐ Rating: {course.avgRating || 'N/A'} ({course.ratingCount || 0} reviews)</p>

      {!following ? (
        <button onClick={followCourse} className="bg-blue-600 px-4 py-2 rounded">+ Add to My Courses</button>
      ) : (
        <p className="text-green-400 font-semibold">✅ You follow this course</p>
      )}

      {following && (
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
      )}

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
