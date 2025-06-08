import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
})

export async function POST(req: NextRequest) {
  try {
    const { slot, studentId, tutorId, rate } = await req.json()

    if (!slot || !studentId || !tutorId || !rate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Tutoring session with ${tutorId}`,
            },
            unit_amount: Math.round(rate * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        slotId: slot.id,
        tutorId,
        studentId,
      },
      success_url: `${process.env.NEXT_PUBLIC_DOMAIN}/booking/success?slotId=${slot.id}&tutorId=${tutorId}&studentId=${studentId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_DOMAIN}/dashboard/sessions?cancelled=true`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
