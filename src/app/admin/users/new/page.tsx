// This is now a Server Component
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { UserRole } from '@/generated/prisma';
import CreateUserForm from './CreateUserForm'; // Import the new client component
import { pageContainer } from '@/styles/ui-classes';

export default async function CreateUserPage() {
  const session = await getServerSession(authOptions);

  // Check if user is authenticated and is an admin
  if (!session || !session.user || session.user.role !== UserRole.admin) {
    redirect('/unauthorized'); // Or your preferred unauthorized/login page
  }

  // If authorized, render the client component that contains the form
  return (
    <div className={pageContainer}>
      <CreateUserForm />
    </div>
  );
}

