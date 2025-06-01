'use client'

import { useEffect, useState } from 'react'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<any>({})
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login')
        return
      }

      const ref = doc(db, 'users', user.uid)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        setUserData({ id: snap.id, ...snap.data() })
      }
      setLoading(false)
    })

    return () => unsub()
  }, [])

  const handleSave = async () => {
    if (!userData.id) return

    const ref = doc(db, 'users', userData.id)
    await updateDoc(ref, {
      name: userData.name,
      school: userData.school
    })

    setEditMode(false)
  }

  if (loading) return <div className="text-white p-6">Loading...</div>

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">👤 My Profile</h1>

      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm text-gray-400">Name:</label>
          {editMode ? (
            <input
              className="w-full bg-gray-800 p-2 rounded"
              value={userData.name || ''}
              onChange={(e) => setUserData({ ...userData, name: e.target.value })}
            />
          ) : (
            <p>{userData.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-400">Email:</label>
          <p>{userData.email}</p>
        </div>

        <div>
          <label className="block text-sm text-gray-400">School:</label>
          {editMode ? (
            <input
              className="w-full bg-gray-800 p-2 rounded"
              value={userData.school || ''}
              onChange={(e) => setUserData({ ...userData, school: e.target.value })}
            />
          ) : (
            <p>{userData.school}</p>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-400">Role:</label>
          <p>{userData.role}</p>
        </div>

        <div className="flex gap-3">
          {editMode ? (
            <>
              <button className="bg-green-600 px-4 py-2 rounded" onClick={handleSave}>
                💾 Save
              </button>
              <button className="bg-gray-700 px-4 py-2 rounded" onClick={() => setEditMode(false)}>
                ❌ Cancel
              </button>
            </>
          ) : (
            <button className="bg-blue-600 px-4 py-2 rounded" onClick={() => setEditMode(true)}>
              ✏️ Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
