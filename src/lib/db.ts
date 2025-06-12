import { PrismaClient } from '../generated/prisma';

// Define the global type for PrismaClient
declare global {
  var prisma: PrismaClient | undefined;
}

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
export const db = global.prisma || new PrismaClient();

// In development, keep the connection alive between hot reloads
if (process.env.NODE_ENV !== 'production') global.prisma = db;
