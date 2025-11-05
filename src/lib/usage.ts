import { db } from './db';
import { UsageType } from '../generated/prisma';

export async function trackUsage(userId: number, type: UsageType) {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();

  await db.usageTracking.upsert({
    where: {
      user_id_type_month_year: {
        user_id: userId,
        type,
        month,
        year,
      },
    },
    update: {
      count: {
        increment: 1,
      },
    },
    create: {
      user_id: userId,
      type,
      count: 1,
      month,
      year,
    },
  });
}

export async function getUsage(userId: number, type: UsageType): Promise<number> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const usage = await db.usageTracking.findUnique({
    where: {
      user_id_type_month_year: {
        user_id: userId,
        type,
        month,
        year,
      },
    },
  });

  return usage?.count || 0;
}

export async function getUserLimits(userId: number) {
  // Get user's subscription
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

  if (!user?.subscriptions?.[0]) {
    // Free plan defaults
    return {
      fileUploads: 10,
      chatMessages: 20,
      documentExports: 5,
      aiModels: 'basic',
    };
  }

  const plan = user.subscriptions[0].plan;
  return plan.features as {
    fileUploads: number;
    chatMessages: number;
    documentExports: number;
    aiModels: string;
  };
}

export async function checkLimit(userId: number, type: UsageType): Promise<boolean> {
  const limits = await getUserLimits(userId);
  const currentUsage = await getUsage(userId, type);

  const limitKey = {
    [UsageType.file_upload]: 'fileUploads',
    [UsageType.chat_message]: 'chatMessages',
    [UsageType.document_export]: 'documentExports',
  }[type];

  const limit = limits[limitKey as keyof typeof limits] as number;
  if (limit === -1) return true; // unlimited
  return currentUsage < limit;
}