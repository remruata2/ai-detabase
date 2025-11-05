import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed.`, err.message);
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      // Handle successful payment - create subscription record
      if (session.mode === 'subscription' && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const customer = await stripe.customers.retrieve(session.customer as string);

        // Find user by customer email
        const user = await db.user.findUnique({
          where: { email: (customer as any).email },
        });

        if (user) {
          // Find plan by price
          const price = await stripe.prices.retrieve(subscription.items.data[0].price.id);
          const plan = await db.subscriptionPlan.findFirst({
            where: { price: price.unit_amount! / 100 },
          });

          if (plan) {
            await db.userSubscription.create({
              data: {
                user_id: user.id,
                plan_id: plan.id,
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: session.subscription as string,
                status: subscription.status,
                current_period_start: new Date((subscription as any).current_period_start * 1000),
                current_period_end: new Date((subscription as any).current_period_end * 1000),
              },
            });
          }
        }
      }
      break;
    case 'invoice.payment_succeeded':
      // Handle recurring payment - update subscription status
      break;
    case 'customer.subscription.updated':
      // Handle subscription updates
      const updatedSub = event.data.object;
      await db.userSubscription.updateMany({
        where: { stripe_subscription_id: updatedSub.id },
        data: {
          status: updatedSub.status,
          current_period_start: new Date((updatedSub as any).current_period_start * 1000),
          current_period_end: new Date((updatedSub as any).current_period_end * 1000),
        },
      });
      break;
    case 'customer.subscription.deleted':
      // Handle subscription cancellation
      const deletedSub = event.data.object;
      await db.userSubscription.updateMany({
        where: { stripe_subscription_id: deletedSub.id },
        data: { status: 'canceled' },
      });
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}