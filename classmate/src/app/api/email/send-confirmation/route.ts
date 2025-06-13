import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: Request) {
  try {
    const {
      tutorEmail,
      studentEmail,
      tutorName,
      studentName,
      startTime,
      endTime,
      rate,
    } = await req.json()

    const toDate = (input: any): Date => {
      if (input?.seconds) {
        return new Date(input.seconds * 1000)
      } else {
        return new Date(input)
      }
    }

    const formattedStart = toDate(startTime).toLocaleString()
    const formattedEnd = toDate(endTime).toLocaleString()

    const message = `
✅ Booking Confirmed!

📅 Time: ${formattedStart} - ${formattedEnd}
🧑‍🏫 Tutor: ${tutorName}
👨‍🎓 Student: ${studentName}
💵 Rate: $${Number(rate).toFixed(2)}
    `

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'anirudhmahesh13@gmail.com',
        pass: 'vabu zzul fwah wshg', // Your app password
      },
    })

    const recipients = [tutorEmail, studentEmail]

    const sendMailPromises = recipients.map((to) =>
      transporter.sendMail({
        from: 'anirudhmahesh13@gmail.com',
        to,
        subject: '📚 Classmate Session Confirmed',
        text: message,
      })
    )

    await Promise.all(sendMailPromises)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to send confirmation email:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
