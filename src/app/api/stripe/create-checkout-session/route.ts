import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let priceId = null;
    if (request.method === 'POST') {
      const body = await request.json();
      priceId = body.priceId;
    }

    // For GET requests (from pricing page), get planId from query
    const url = new URL(request.url);
    const planId = url.searchParams.get('planId');

    if (!priceId && !planId) {
      return NextResponse.json({ error: 'priceId or planId required' }, { status: 400 });
    }

    // Get or create Stripe customer
    let customerId = null;
    const user = await db.user.findUnique({
      where: { id: parseInt(session.user.id) },
      include: { subscriptions: true },
    });

    if (user?.subscriptions?.[0]?.stripe_customer_id) {
      customerId = user.subscriptions[0].stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name,
      });
      customerId = customer.id;
    }

    let priceIdToUse = priceId;

    if (planId) {
      // Get plan and create price or use existing
      const plan = await db.subscriptionPlan.findUnique({
        where: { id: parseInt(planId) },
      });
      if (!plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      }

      // For now, assume we have Stripe price IDs stored or create on the fly
      // In production, you'd have price IDs in the plan table
      // For demo, create price
      const price = await stripe.prices.create({
        unit_amount: plan.price * 100, // cents
        currency: plan.currency.toLowerCase(),
        recurring: { interval: plan.interval as 'month' | 'year' },
        product_data: {
          name: plan.name,
        },
      });
      priceIdToUse = price.id;
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceIdToUse,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}