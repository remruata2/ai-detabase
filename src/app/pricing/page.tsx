import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function PricingPage() {
  const plans = await db.subscriptionPlan.findMany({
    where: { active: true },
    orderBy: { price: 'asc' },
  });

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-gray-600">
          Select the perfect plan for your document processing needs
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {plans.map((plan) => (
          <Card key={plan.id} className={plan.name === 'Premium' ? 'border-blue-200 ring-2 ring-blue-100' : ''}>
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="text-3xl font-bold">
                ${plan.price}
                <span className="text-lg font-normal text-gray-600">/{plan.interval}</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                {plan.features && typeof plan.features === 'object' && !Array.isArray(plan.features) && (
                  <>
                    <li>
                      {(plan.features as any).fileUploads === -1 ? 'Unlimited' : (plan.features as any).fileUploads} file uploads/month
                    </li>
                    <li>
                      {(plan.features as any).chatMessages === -1 ? 'Unlimited' : (plan.features as any).chatMessages} chat messages/month
                    </li>
                    <li>
                      {(plan.features as any).documentExports === -1 ? 'Unlimited' : (plan.features as any).documentExports} document exports/month
                    </li>
                    <li>Access to {(plan.features as any).aiModels} AI models</li>
                  </>
                )}
              </ul>
              {plan.price === 0 ? (
                <p className="text-center text-gray-600">Current plan</p>
              ) : (
                <Link href={`/api/stripe/create-checkout-session?planId=${plan.id}`}>
                  <Button className="w-full" size="lg">
                    Subscribe to {plan.name}
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center mt-12">
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}