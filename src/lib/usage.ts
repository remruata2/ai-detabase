import { db } from './db';
import { UsageType } from '../generated/prisma';
import { cache } from './cache';

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

  const cacheKey = `usage:${userId}:${type}:${month}:${year}`;
  const cached = cache.get<number>(cacheKey);
  if (cached !== null) return cached;

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

  const count = usage?.count || 0;
  cache.set(cacheKey, count, 2 * 60 * 1000); // 2 min cache
  return count;
}

export async function getUserLimits(userId: number) {
  const cacheKey = `limits:${userId}`;
  const cached = cache.get<any>(cacheKey);
  if (cached) return cached;

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

  let limits;
  if (!user?.subscriptions?.[0]) {
    // Free plan defaults
    limits = {
      fileUploads: 10,
      chatMessages: 20,
      documentExports: 5,
      aiModels: 'basic',
    };
  } else {
    const plan = user.subscriptions[0].plan;
    limits = plan.features as {
      fileUploads: number;
      chatMessages: number;
      documentExports: number;
      aiModels: string;
    };
  }

  cache.set(cacheKey, limits, 10 * 60 * 1000); // 10 min cache
  return limits;
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