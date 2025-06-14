import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  try {
    const {
      tutorEmail,
      studentEmail,
      tutorName,
      studentName,
      startTime,
      endTime,
      cancelledBy
    } = await req.json()

    if (!tutorEmail || !studentEmail || !startTime || !endTime || !cancelledBy) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const start = new Date(startTime.seconds * 1000).toLocaleString()
    const end = new Date(endTime.seconds * 1000).toLocaleString()

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'anirudhmahesh13@gmail.com',
        pass: 'vabu zzul fwah wshg'
      }
    })

    const subject = '❌ Classmate Session Cancelled'
    const text = `
      A tutoring session has been cancelled.

      Cancelled by: ${cancelledBy === 'student' ? studentName : tutorName}
      Time: ${start} – ${end}

      Tutor: ${tutorName} (${tutorEmail})
      Student: ${studentName} (${studentEmail})
    `

    const html = `
      <h2>❌ Classmate Session Cancelled</h2>
      <p>⛔ <strong>Cancelled by:</strong> ${cancelledBy === 'student' ? studentName : tutorName}</p>
      <p>🗓️ <strong>Time:</strong> ${start} – ${end}</p>
      <p>🧑‍🏫 <strong>Tutor:</strong> ${tutorName} (${tutorEmail})</p>
      <p>🎓 <strong>Student:</strong> ${studentName} (${studentEmail})</p>
    `

    const recipients = [tutorEmail, studentEmail]

    await transporter.sendMail({
      from: 'anirudhmahesh13@gmail.com',
      to: recipients,
      subject,
      text,
      html
    })

    return NextResponse.json({ message: 'Cancellation email sent successfully' })
  } catch (err) {
    console.error('Email error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
