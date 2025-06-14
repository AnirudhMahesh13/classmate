import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-04-10'
})

export async function POST(req: NextRequest) {
  try {
    const { stripeSessionId } = await req.json()

    if (!stripeSessionId) {
      return NextResponse.json({ error: 'Missing stripeSessionId' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.retrieve(stripeSessionId)

    if (!session.payment_intent) {
      return NextResponse.json({ error: 'No payment intent found for session' }, { status: 400 })
    }

    const paymentIntentId = session.payment_intent.toString()

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId
    })

    return NextResponse.json({ success: true, refund })
  } catch (err) {
    console.error('[STRIPE_REFUND_ERROR]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
