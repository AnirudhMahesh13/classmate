'use client'

import Link from 'next/link'

export default function TutorPage() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">🎓 Tutor Hub</h1>

      <p className="mb-4 text-gray-300">
        Welcome to the Tutor Hub. From here, you can apply to become a tutor, view your application status, or manage your tutor profile once approved.
      </p>

      <div className="space-y-4">
        <Link
          href="/tutor/apply"
          className="block bg-green-600 px-4 py-3 rounded hover:bg-green-700 w-full max-w-sm"
        >
          📝 Apply to Become a Tutor
        </Link>

        {/* UNCOMMENT FOR TUTOR PROFILE AFTER IMPLEMENTATION
        <Link
          href="/tutor/profile"
          className="block bg-blue-600 px-4 py-3 rounded hover:bg-blue-700 w-full max-w-sm"
        >
          📄 View/Edit Tutor Profile
        </Link>
        */}

        {/* UNCOMMENT FOR SESSION MANAGEMENT AFTER IMPLEMENTATION
        <Link
          href="/tutor/sessions"
          className="block bg-purple-600 px-4 py-3 rounded hover:bg-purple-700 w-full max-w-sm"
        >
          📅 Manage Tutoring Sessions
        </Link>
        */}
      </div>
    </div>
  )
}
