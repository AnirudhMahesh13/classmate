'use client'

import './globals.css'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const showNavbar = !['/login', '/school'].includes(pathname)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAdmin(false)
        return
      }

      const ref = doc(db, 'users', user.uid)
      const snap = await getDoc(ref)
      const data = snap.data()

      if (data?.role === 'admin') {
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
      }
    })

    return () => unsub()
  }, [])

  const handleLogout = async () => {
    await auth.signOut()
    router.push('/login')
  }

  return (
    <html lang="en">
      <body className="bg-black text-white min-h-screen flex flex-col">
        {showNavbar && (
          <nav className="w-full bg-gray-900 px-6 py-4 flex items-center justify-between shadow">
            <div className="flex space-x-6 text-lg font-medium">
              <Link href="/dashboard" className="hover:underline">🏠 Dashboard</Link>
              <Link href="/courses" className="hover:underline">📚 Courses</Link>
              <Link href="/professors" className="hover:underline">👨‍🏫 Professors</Link>
              <Link href="/tutor/tutorhub" className="hover:underline">🧑‍🏫 Tutor Hub</Link>
              <Link href="/tutor" className="hover:underline">🎓 My Tutors</Link>
              <Link href="/profile" className="hover:underline">👤 Profile</Link>
              {isAdmin && (
                <Link href="/admin" className="hover:underline">🛠 Admin Dashboard</Link>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 px-3 py-1 rounded hover:bg-red-700 text-sm"
            >
              🚪 Logout
            </button>
          </nav>
        )}

        <main className="flex-grow p-6">{children}</main>

        {showNavbar && (
          <footer className="bg-gray-900 text-gray-400 py-6 px-4">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
              <p>© {new Date().getFullYear()} Classmate. All rights reserved.</p>
              <div className="flex gap-6 text-sm">
                <Link href="/about" className="hover:text-white">About</Link>
                <Link href="/contact" className="hover:text-white">Contact</Link>
                <Link href="/privacy" className="hover:text-white">Privacy</Link>
              </div>
            </div>
          </footer>
        )}
      </body>
    </html>
  )
}
