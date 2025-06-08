// app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(req: NextRequest) {
  try {
    const { tutorName, tutorId, studentId, sessionId, price } = await req.json()

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Tutoring with ${tutorName}`,
            },
            unit_amount: price * 100, // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        tutorId,
        studentId,
        sessionId,
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/tutor/${tutorId}`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Stripe session creation failed' }, { status: 500 })
  }
}
