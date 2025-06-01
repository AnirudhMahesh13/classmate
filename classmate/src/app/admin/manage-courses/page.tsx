'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import {
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  collection,
  updateDoc,
  arrayRemove,
  arrayUnion,
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

export default function ManageCoursesPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<any[]>([])
  const [schoolId, setSchoolId] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingCourse, setEditingCourse] = useState<any | null>(null)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [allProfessors, setAllProfessors] = useState<any[]>([])
  const [selectedProfessors, setSelectedProfessors] = useState<string[]>([])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      const userRef = doc(db, 'users', user.uid)
      const userSnap = await getDoc(userRef)
      const data = userSnap.data()

      if (data?.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      const school = data.school
      setSchoolId(school)

      const courseSnap = await getDocs(collection(db, 'schools', school, 'courses'))
      const courseList = courseSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setCourses(courseList)
      setLoading(false)
    })

    return () => unsub()
  }, [])

  const handleDelete = async (courseId: string, professorIds: string[]) => {
    for (const profId of professorIds) {
      const profRef = doc(db, 'schools', schoolId, 'professors', profId)
      await updateDoc(profRef, {
        courses: arrayRemove(courseId),
      })
    }

    await deleteDoc(doc(db, 'schools', schoolId, 'courses', courseId))
    setCourses((prev) => prev.filter((c) => c.id !== courseId))
  }

  const startEdit = async (course: any) => {
    setEditingCourse(course)
    setEditName(course.name)
    setEditCode(course.code)
    setSelectedProfessors(course.professors || [])

    const profSnap = await getDocs(collection(db, 'schools', schoolId, 'professors'))
    const profList = profSnap.docs.map(p => ({
      id: p.id,
      name: p.data().name,
    }))
    setAllProfessors(profList)
  }

  const handleEditSave = async () => {
    if (!editingCourse) return

    const courseRef = doc(db, 'schools', schoolId, 'courses', editingCourse.id)
    const courseSnap = await getDoc(courseRef)
    const current = courseSnap.data()
    const currentProfessors = current?.professors || []

    const removed = currentProfessors.filter((id: string) => !selectedProfessors.includes(id))
    const added = selectedProfessors.filter((id: string) => !currentProfessors.includes(id))

    for (const profId of removed) {
      const profRef = doc(db, 'schools', schoolId, 'professors', profId)
      await updateDoc(profRef, {
        courses: arrayRemove(editingCourse.id),
      })
    }

    for (const profId of added) {
      const profRef = doc(db, 'schools', schoolId, 'professors', profId)
      await updateDoc(profRef, {
        courses: arrayUnion(editingCourse.id),
      })
    }

    await updateDoc(courseRef, {
      name: editName,
      code: editCode,
      professors: selectedProfessors,
    })

    setCourses((prev) =>
      prev.map((c) =>
        c.id === editingCourse.id ? { ...c, name: editName, code: editCode, professors: selectedProfessors } : c
      )
    )

    setEditingCourse(null)
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">🛠 Manage Courses</h1>

      {loading ? (
        <p>Loading courses...</p>
      ) : courses.length === 0 ? (
        <p>No courses found.</p>
      ) : (
        <ul className="space-y-4">
          {courses.map((course) => (
            <li key={course.id} className="bg-gray-800 p-4 rounded shadow">
              <h2 className="text-xl font-bold">{course.code}: {course.name}</h2>
              <div className="flex gap-4 mt-3">
                <button
                  onClick={() => startEdit(course)}
                  className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDelete(course.id, course.professors || [])}
                  className="bg-red-600 px-3 py-1 rounded hover:bg-red-700"
                >
                  🗑️ Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editingCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Edit Course</h2>
            <input
              className="w-full p-3 mb-3 bg-gray-800 rounded"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Course Name"
            />
            <input
              className="w-full p-3 mb-4 bg-gray-800 rounded"
              value={editCode}
              onChange={(e) => setEditCode(e.target.value)}
              placeholder="Course Code"
            />
            <div className="mb-4 max-h-40 overflow-y-auto text-sm">
              <p className="mb-2">Assign Professors:</p>
              {allProfessors.map((prof) => (
                <label key={prof.id} className="block mb-1">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={selectedProfessors.includes(prof.id)}
                    onChange={() => {
                      setSelectedProfessors(prev =>
                        prev.includes(prof.id)
                          ? prev.filter(id => id !== prof.id)
                          : [...prev, prof.id]
                      )
                    }}
                  />
                  {prof.name}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button
                className="bg-gray-700 px-4 py-2 rounded hover:bg-gray-600"
                onClick={() => setEditingCourse(null)}
              >
                Cancel
              </button>
              <button
                className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
                onClick={handleEditSave}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
