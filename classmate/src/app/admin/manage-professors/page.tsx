'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/lib/firebase'
import {
  collection,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  arrayRemove,
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

export default function ManageProfessorsPage() {
  const router = useRouter()
  const [professors, setProfessors] = useState<any[]>([])
  const [schoolId, setSchoolId] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingProfessor, setEditingProfessor] = useState<any | null>(null)
  const [editFields, setEditFields] = useState<any>({})
  const [allCourses, setAllCourses] = useState<any[]>([])

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

      const profSnap = await getDocs(collection(db, 'schools', school, 'professors'))
      const profList = profSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
      setProfessors(profList)

      const courseSnap = await getDocs(collection(db, 'schools', school, 'courses'))
      const courseList = courseSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
      setAllCourses(courseList)

      setLoading(false)
    })

    return () => unsub()
  }, [])

  const handleDelete = async (profId: string, courseIds: string[]) => {
    for (const courseId of courseIds || []) {
      const courseRef = doc(db, 'schools', schoolId, 'courses', courseId)
      await updateDoc(courseRef, {
        professors: arrayRemove(profId),
      })
    }

    await deleteDoc(doc(db, 'schools', schoolId, 'professors', profId))
    setProfessors(prev => prev.filter(p => p.id !== profId))
  }

  const startEdit = (prof: any) => {
    setEditingProfessor(prof)
    setEditFields({
      name: prof.name || '',
      email: prof.email || '',
      department: prof.department || '',
      bio: prof.bio || '',
      courses: prof.courses || [],
    })
  }

  const handleEditField = (field: string, value: any) => {
    setEditFields((prev: any) => ({ ...prev, [field]: value }))
  }

  const handleEditSave = async () => {
    if (!editingProfessor) return

    const profRef = doc(db, 'schools', schoolId, 'professors', editingProfessor.id)
    await updateDoc(profRef, {
      ...editFields,
    })

    setProfessors(prev =>
      prev.map(p =>
        p.id === editingProfessor.id ? { ...p, ...editFields } : p
      )
    )
    setEditingProfessor(null)
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">🛠 Manage Professors</h1>

      {loading ? (
        <p>Loading professors...</p>
      ) : professors.length === 0 ? (
        <p>No professors found.</p>
      ) : (
        <ul className="space-y-4">
          {professors.map(prof => (
            <li key={prof.id} className="bg-gray-800 p-4 rounded shadow">
              <h2 className="text-xl font-bold">{prof.name}</h2>
              <p className="text-sm text-gray-300">{prof.email}</p>
              <p className="text-sm text-gray-300">Dept: {prof.department}</p>
              <p className="text-sm text-gray-300">{prof.bio}</p>
              <div className="flex gap-4 mt-3">
                <button
                  onClick={() => startEdit(prof)}
                  className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDelete(prof.id, prof.courses || [])}
                  className="bg-red-600 px-3 py-1 rounded hover:bg-red-700"
                >
                  🗑️ Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editingProfessor && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded shadow-lg w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-4">Edit Professor</h2>
            <input
              className="w-full p-3 mb-3 bg-gray-800 rounded"
              value={editFields.name}
              onChange={(e) => handleEditField('name', e.target.value)}
              placeholder="Professor Name"
            />
            <input
              className="w-full p-3 mb-3 bg-gray-800 rounded"
              value={editFields.email}
              onChange={(e) => handleEditField('email', e.target.value)}
              placeholder="Email"
            />
            <input
              className="w-full p-3 mb-3 bg-gray-800 rounded"
              value={editFields.department}
              onChange={(e) => handleEditField('department', e.target.value)}
              placeholder="Department"
            />
            <textarea
              className="w-full p-3 mb-3 bg-gray-800 rounded"
              value={editFields.bio}
              onChange={(e) => handleEditField('bio', e.target.value)}
              placeholder="Bio"
            />
            <label className="block mb-1">Courses:</label>
            <select
              multiple
              className="w-full p-3 mb-4 bg-gray-800 rounded h-32"
              value={editFields.courses}
              onChange={(e) =>
                handleEditField('courses', Array.from(e.target.selectedOptions).map(o => o.value))
              }
            >
              {allCourses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-3">
              <button
                className="bg-gray-700 px-4 py-2 rounded hover:bg-gray-600"
                onClick={() => setEditingProfessor(null)}
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
