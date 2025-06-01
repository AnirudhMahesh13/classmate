'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db, storage } from '@/lib/firebase'
import {
  collection,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore'
// import { getDownloadURL, ref } from 'firebase/storage' // UNCOMMENT FOR TRANSCRIPT UPLOAD
import { onAuthStateChanged } from 'firebase/auth'

export default function PendingTutorsPage() {
  const router = useRouter()
  const [applications, setApplications] = useState<any[]>([])
  const [schoolId, setSchoolId] = useState('')
  const [loading, setLoading] = useState(true)
  const [userMap, setUserMap] = useState<Record<string, any>>({})
  const [courseMap, setCourseMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      const userSnap = await getDoc(doc(db, 'users', user.uid))
      const data = userSnap.data()
      if (data?.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      const school = data.school
      setSchoolId(school)

      const snap = await getDocs(collection(db, 'schools', school, 'pendingTutors'))
      const rawApps = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setApplications(rawApps)

      const userSnaps = await Promise.all(
        rawApps.map(app => getDoc(doc(db, 'users', app.uid)))
      )
      const userMapObj: Record<string, any> = {}
      userSnaps.forEach(snap => {
        if (snap.exists()) userMapObj[snap.id] = snap.data()
      })
      setUserMap(userMapObj)

      const courseSnap = await getDocs(collection(db, 'schools', school, 'courses'))
      const courseMapObj: Record<string, string> = {}
      courseSnap.docs.forEach(doc => {
        courseMapObj[doc.id] = doc.data().name
      })
      setCourseMap(courseMapObj)

      setLoading(false)
    })

    return () => unsub()
  }, [])

  const approve = async (app: any) => {
    const tutorRef = doc(db, 'schools', schoolId, 'tutors', app.uid)
    await setDoc(tutorRef, {
      uid: app.uid,
      courses: app.selectedCourses,
      createdAt: serverTimestamp(),
      approvedBy: auth.currentUser?.uid,
      // transcriptURL: app.transcriptURL // UNCOMMENT FOR TRANSCRIPT UPLOAD
    })

    for (const courseId of app.selectedCourses) {
      const courseRef = doc(db, 'schools', schoolId, 'courses', courseId)
      await updateDoc(courseRef, {
        tutors: arrayUnion(app.uid)
      })
    }

    await deleteDoc(doc(db, 'schools', schoolId, 'pendingTutors', app.uid))
    setApplications(prev => prev.filter(a => a.uid !== app.uid))
  }

  const reject = async (uid: string) => {
    await deleteDoc(doc(db, 'schools', schoolId, 'pendingTutors', uid))
    setApplications(prev => prev.filter(a => a.uid !== uid))
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">📥 Pending Tutor Applications</h1>

      {loading ? (
        <p>Loading...</p>
      ) : applications.length === 0 ? (
        <p>No pending tutor applications.</p>
      ) : (
        <ul className="space-y-6">
          {applications.map(app => {
            const user = userMap[app.uid]
            return (
              <li key={app.uid} className="bg-gray-800 p-4 rounded shadow">
                <h2 className="text-xl font-bold">
                  {user?.name || 'Unknown User'} ({user?.school || 'Unknown School'})
                </h2>
                <p className="text-gray-300 mt-1">
                  Courses: {app.selectedCourses.map(id => courseMap[id] || 'Unknown').join(', ')}
                </p>

                {/* UNCOMMENT FOR TRANSCRIPT UPLOAD */}
                {/* {app.transcriptURL && (
                  <a
                    href={app.transcriptURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-400 mt-2 underline"
                  >
                    📄 View Transcript
                  </a>
                )} */}

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => approve(app)}
                    className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() => reject(app.uid)}
                    className="bg-red-600 px-4 py-2 rounded hover:bg-red-700"
                  >
                    ❌ Reject
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
