import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function BillingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const userId = parseInt(session.user.id);

  // Get user subscription
  const subscription = await db.userSubscription.findFirst({
    where: { user_id: userId },
    include: { plan: true },
  });

  if (!subscription?.stripe_customer_id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Billing</h1>
        <p>No billing information available.</p>
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  // Get invoices from Stripe
  const invoices = await stripe.invoices.list({
    customer: subscription.stripe_customer_id,
    limit: 10,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Billing History</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Current Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <p><strong>Plan:</strong> {subscription.plan.name}</p>
          <p><strong>Status:</strong> {subscription.status}</p>
          <p><strong>Next Billing:</strong> {new Date(subscription.current_period_end).toLocaleDateString()}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>Your recent invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.data.length === 0 ? (
            <p>No invoices found.</p>
          ) : (
            <div className="space-y-4">
              {invoices.data.map((invoice) => (
                <div key={invoice.id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <p className="font-semibold">
                      {new Date(invoice.created * 1000).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      Status: {invoice.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      ${(invoice.amount_due / 100).toFixed(2)}
                    </p>
                    {invoice.invoice_pdf && (
                      <a
                        href={invoice.invoice_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Download PDF
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-8">
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}