import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUsage, getUserLimits } from "@/lib/usage";
import { UsageType } from "@/generated/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const userId = parseInt(session.user.id);

  // Get user subscription
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: {
        include: { plan: true },
        where: { status: 'active' },
        orderBy: { created_at: 'desc' },
        take: 1,
      },
    },
  });

  const subscription = user?.subscriptions?.[0];
  const plan = subscription?.plan;

  // Get usage
  const [fileUploads, chatMessages, exports] = await Promise.all([
    getUsage(userId, UsageType.file_upload),
    getUsage(userId, UsageType.chat_message),
    getUsage(userId, UsageType.document_export),
  ]);

  const limits = await getUserLimits(userId);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {/* Subscription Info */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Your current plan and billing information</CardDescription>
        </CardHeader>
        <CardContent>
          {plan ? (
            <div>
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p className="text-gray-600">{plan.description}</p>
              <p className="text-2xl font-bold mt-2">
                ${plan.price}/{plan.interval}
              </p>
              {subscription && (
                <p className="text-sm text-gray-500">
                  Next billing: {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
          ) : (
            <div>
              <h3 className="text-xl font-semibold">Free Plan</h3>
              <p className="text-gray-600">Basic features</p>
              <Link href="/pricing">
                <Button className="mt-4">Upgrade to Premium</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>File Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fileUploads} / {limits.fileUploads === -1 ? '∞' : limits.fileUploads}
            </div>
            <p className="text-sm text-gray-600">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chat Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {chatMessages} / {limits.chatMessages === -1 ? '∞' : limits.chatMessages}
            </div>
            <p className="text-sm text-gray-600">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Document Exports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {exports} / {limits.documentExports === -1 ? '∞' : limits.documentExports}
            </div>
            <p className="text-sm text-gray-600">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/chat">
            <Button className="w-full">Start Chat</Button>
          </Link>
          <Link href="/upload">
            <Button variant="outline" className="w-full">Upload Document</Button>
          </Link>
          {plan?.name !== 'Premium' && (
            <Link href="/pricing">
              <Button variant="secondary" className="w-full">Upgrade Plan</Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}