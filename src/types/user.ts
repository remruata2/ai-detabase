// Re-export UserRole from Prisma to maintain backward compatibility
import { UserRole } from '@/generated/prisma';
export { UserRole };

export interface User {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  emailVerified: Date | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}
