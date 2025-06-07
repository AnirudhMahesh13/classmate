'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import Link from 'next/link'

export default function TutorsPage() {
  const router = useRouter()
  const [schoolId, setSchoolId] = useState('')
  const [tutors, setTutors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      const userRef = doc(db, 'users', user.uid)
      const userSnap = await getDoc(userRef)
      const school = userSnap.data()?.school

      if (!school) {
        router.push('/school')
        return
      }

      setSchoolId(school)

      const tutorSnap = await getDocs(collection(db, 'schools', school, 'tutors'))

      const tutorList = await Promise.all(
        tutorSnap.docs.map(async (docSnap) => {
          const tutorData = docSnap.data()
          const uid = docSnap.id

          let name = 'Unknown Tutor'

          try {
            const userDoc = await getDoc(doc(db, 'users', uid))
            if (userDoc.exists()) {
              const userData = userDoc.data()
              name = userData.displayName || userData.email || name
            }
          } catch (error) {
            console.error('Error fetching user for tutor:', uid, error)
          }

          return {
            id: uid,
            name,
            specialty: tutorData.specialty || '',
          }
        })
      )

      console.log('Fetched tutors:', tutorList)

      setTutors(tutorList)
      setLoading(false)
    })

    return () => unsub()
  }, [])

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">📘 Tutors</h1>

      {loading ? (
        <p>Loading tutors...</p>
      ) : tutors.length === 0 ? (
        <p>No tutors found.</p>
      ) : (
        <ul className="space-y-4 mb-6">
          {tutors.map((tutor) => (
            <li key={tutor.id} className="bg-gray-800 p-4 rounded shadow">
              <Link href={`/tutor/${tutor.id}`} className="text-xl font-semibold hover:underline">
                {tutor.name}
              </Link>
              <p className="text-gray-400">{tutor.specialty || 'No specialty listed'}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
