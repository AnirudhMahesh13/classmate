'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

export default function TutorProfilePage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [schoolName, setSchoolName] = useState('')
  const [courses, setCourses] = useState<string[]>([])
  const [joinDate, setJoinDate] = useState('')
  const [avgRating, setAvgRating] = useState<number | null>(null)
  const [sessionCount, setSessionCount] = useState<number>(0)

  const [bio, setBio] = useState('')
  const [specialty, setSpecialty] = useState('')

  const router = useRouter()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login')
        return
      }

      const userRef = doc(db, 'users', currentUser.uid)
      const userSnap = await getDoc(userRef)
      const userData = userSnap.data()

      if (!userData?.school) {
        router.push('/school')
        return
      }

      setUser({ ...userData, uid: currentUser.uid })

      const tutorRef = doc(db, 'schools', userData.school, 'tutors', currentUser.uid)
      const tutorSnap = await getDoc(tutorRef)

      if (!tutorSnap.exists()) {
        router.push('/tutor/apply')
        return
      }

      const tutorData = tutorSnap.data()
      const coursesSnap = await getDocs(collection(db, 'schools', userData.school, 'courses'))

      const courseNames = tutorData.courses?.map((id: string) => {
        const match = coursesSnap.docs.find(doc => doc.id === id)
        return match ? match.data().name : 'Unknown'
      }) || []

      setCourses(courseNames)

      if (tutorData.createdAt?.seconds) {
        const date = new Date(tutorData.createdAt.seconds * 1000)
        setJoinDate(date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }))
      }

      setAvgRating(tutorData.avgRating || 4.8)
      setSessionCount(tutorData.totalSessions || 12)

      setBio(tutorData.bio || '')
      setSpecialty(tutorData.specialty || '')
      setSchoolName(userData.school)
      setLoading(false)
    })

    return () => unsub()
  }, [])

  const handleSave = async () => {
    if (!user || !schoolName) return

    const tutorRef = doc(db, 'schools', schoolName, 'tutors', user.uid)
    await updateDoc(tutorRef, {
      bio,
      specialty,
    })

    alert('✅ Profile updated!')
  }

  if (loading) return <div className="text-white p-6">Loading profile...</div>

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">📄 Tutor Profile</h1>

      <div className="space-y-4 max-w-xl">
        <div>
          <strong>Name:</strong> {user?.name || user?.displayName || 'N/A'}
        </div>
        <div>
          <strong>School:</strong> {schoolName}
        </div>
        <div>
          <strong>Courses:</strong> {courses.join(', ')}
        </div>
        <div>
          <strong>Joined:</strong> {joinDate}
        </div>
        <div>
          <strong>Email (private):</strong> {user?.email || 'N/A'}
        </div>
        <div>
          <strong>Average Rating:</strong> ⭐ {avgRating}
        </div>
        <div>
          <strong>Total Sessions:</strong> 📅 {sessionCount}
        </div>

        <div>
          <label className="block mb-1 text-sm">Bio:</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="bg-gray-800 text-white p-2 rounded w-full h-24"
          />
        </div>

        <div>
          <label className="block mb-1 text-sm">Specialty:</label>
          <input
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="bg-gray-800 text-white p-2 rounded w-full"
          />
        </div>

        <button
          onClick={handleSave}
          className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
        >
          💾 Save Profile
        </button>
      </div>
    </div>
  )
}
