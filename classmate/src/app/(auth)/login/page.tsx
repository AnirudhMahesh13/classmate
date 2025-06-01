'use client'

import { useEffect, useState } from 'react'
import { auth, db } from '@/lib/firebase'
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    const user = auth.currentUser
    if (user) {
      console.log('🔁 Already logged in:', user)
      router.push('/select-school') // updated from /dashboard
    }
  }, [])

  const saveUserIfNew = async (user: any) => {
    const userRef = doc(db, 'users', user.uid)
    const existing = await getDoc(userRef)

    if (!existing.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName || user.email,
        email: user.email,
        createdAt: serverTimestamp(),
        role: 'student'
      })
    }
  }

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      console.log('✅ Google sign-in user:', user)

      await saveUserIfNew(user)
      router.push('/select-school') // updated from /dashboard
    } catch (error) {
      console.error('❌ Google login failed:', error)
    }
  }

  const signInWithEmail = async () => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      const user = result.user

      console.log('✅ Email sign-in user:', user)

      await saveUserIfNew(user)
      router.push('/select-school') // updated from /dashboard
    } catch (error) {
      console.error('❌ Email login failed:', error)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white gap-4">
      <h1 className="text-3xl font-bold mb-4">Sign in to Classmate</h1>

      <button onClick={signInWithGoogle} className="bg-blue-600 px-4 py-2 rounded">
        Sign in with Google
      </button>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="bg-gray-800 p-2 rounded w-64"
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="bg-gray-800 p-2 rounded w-64"
      />

      <button onClick={signInWithEmail} className="bg-green-600 px-4 py-2 rounded">
        Sign in with Email
      </button>
    </div>
  )
}
