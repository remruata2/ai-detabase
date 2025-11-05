import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  // Seed subscription plans
  const freePlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'Free' },
    update: {},
    create: {
      name: 'Free',
      description: 'Basic plan for getting started',
      price: 0,
      currency: 'USD',
      interval: 'monthly',
      features: {
        fileUploads: 10,
        chatMessages: 20,
        documentExports: 5,
        aiModels: 'basic'
      },
      active: true,
    },
  });

  const premiumPlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'Premium' },
    update: {},
    create: {
      name: 'Premium',
      description: 'Unlimited access with advanced features',
      price: 29,
      currency: 'USD',
      interval: 'monthly',
      features: {
        fileUploads: -1, // unlimited
        chatMessages: -1,
        documentExports: -1,
        aiModels: 'advanced'
      },
      active: true,
    },
  });

  console.log('Seeded subscription plans:', { freePlan, premiumPlan });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });