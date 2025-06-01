'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  auth,
  db,
  storage
} from '@/lib/firebase'
import {
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  serverTimestamp
} from 'firebase/firestore'
import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage'
import { onAuthStateChanged } from 'firebase/auth'

export default function TutorApplyPage() {
  const router = useRouter()
  const [schoolId, setSchoolId] = useState('')
  const [userId, setUserId] = useState('')
  const [courses, setCourses] = useState<any[]>([])
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null)
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

      setUserId(user.uid)
      setSchoolId(school)

      const courseSnap = await getDocs(collection(db, 'schools', school, 'courses'))
      const courseList = courseSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))
      setCourses(courseList)
      setLoading(false)
    })

    return () => unsub()
  }, [])

const handleSubmit = async (e: any) => {
  e.preventDefault()

  if (!transcriptFile || selectedCourses.length === 0 || !userId) {
    alert('Please upload a transcript, select at least one course, and make sure you are logged in.')
    return
  }

  try {
    //UNCOMMENT FOR TRANSCRIPT UPLOAD
    // const storageRef = ref(storage, `transcripts/${userId}_${Date.now()}`)
    // await uploadBytes(storageRef, transcriptFile)
    // const downloadURL = await getDownloadURL(storageRef)

    await setDoc(doc(db, 'schools', schoolId, 'pendingTutors', userId), {
      uid: userId,
      selectedCourses,
    //UNCOMMENT FOR TRANSCRIPT UPLOAD
    //   transcriptURL: downloadURL,
      createdAt: serverTimestamp(),
    })

    alert('Tutor application submitted successfully!')
    router.push('/dashboard')
  } catch (error) {
    console.error('Upload error:', error)
    alert('Something went wrong with the submission. Please try again.')
  }
}


  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">📨 Apply to Become a Tutor</h1>

      {loading ? (
        <p>Loading courses...</p>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
          <div>
            <label className="block mb-1 font-semibold">📚 Select Courses You Want to Tutor:</label>
            <select
              multiple
              value={selectedCourses}
              onChange={(e) =>
                setSelectedCourses(Array.from(e.target.selectedOptions).map((o) => o.value))
              }
              className="w-full p-3 bg-gray-800 rounded h-40"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} – {course.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 font-semibold">📎 Upload Transcript:</label>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setTranscriptFile(e.target.files?.[0] || null)}
              className="w-full bg-gray-800 rounded p-2"
              required
            />
          </div>

          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded font-semibold"
          >
            ✅ Submit Application
          </button>
        </form>
      )}
    </div>
  )
}
