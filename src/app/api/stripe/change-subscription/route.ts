import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newPlanId } = await request.json();

    if (!newPlanId) {
      return NextResponse.json({ error: 'newPlanId required' }, { status: 400 });
    }

    const userId = parseInt(session.user.id);

    // Get current subscription
    const currentSub = await db.userSubscription.findFirst({
      where: { user_id: userId, status: 'active' },
      include: { plan: true },
    });

    if (!currentSub) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 400 });
    }

    // Get new plan
    const newPlan = await db.subscriptionPlan.findUnique({
      where: { id: parseInt(newPlanId) },
    });

    if (!newPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Create new price for new plan
    const newPrice = await stripe.prices.create({
      unit_amount: newPlan.price * 100,
      currency: newPlan.currency.toLowerCase(),
      recurring: { interval: newPlan.interval as 'month' | 'year' },
      product_data: {
        name: newPlan.name,
      },
    });

    // Update subscription in Stripe
    await stripe.subscriptions.update(currentSub.stripe_subscription_id!, {
      items: [{
        id: (await stripe.subscriptions.retrieve(currentSub.stripe_subscription_id!)).items.data[0].id,
        price: newPrice.id,
      }],
      proration_behavior: 'create_prorations',
    });

    // Update in DB
    await db.userSubscription.update({
      where: { id: currentSub.id },
      data: { plan_id: newPlan.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error changing subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}