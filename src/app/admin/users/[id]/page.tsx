// This is now a Server Component
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import { getUserById } from '@/services/user-service';
import { UserRole } from '@/generated/prisma';
import UserDetailClient, { UserDetailProps } from './UserDetailClient'; // Import the new client component

interface UserDetailPageProps {
  params: { id: string };
}

export default async function UserDetailPage(props: UserDetailPageProps) {
  const { params } = props;
  const session = await getServerSession(authOptions);

  // Check if user is authenticated and is an admin
  if (!session || !session.user || session.user.role !== UserRole.admin) {
    redirect('/unauthorized'); // Or your preferred unauthorized/login page
  }

  const userId = parseInt(params.id, 10);
  let user: UserDetailProps | null = null;
  let error: string | null = null;
  let loading = true; // Start with loading true

  if (isNaN(userId)) {
    error = 'Invalid user ID.';
    loading = false;
  } else {
    try {
      const rawUser = await getUserById(userId);
      if (rawUser) {
        user = {
          ...rawUser,
          // Ensure Date objects are converted to ISO strings for serialization
          last_login: rawUser.last_login ? new Date(rawUser.last_login).toISOString() : null,
          created_at: rawUser.created_at ? new Date(rawUser.created_at).toISOString() : null,
        };
      } else {
        error = 'User not found.';
      }
    } catch (err: any) {
      console.error('Failed to fetch user:', err);
      error = 'Failed to load user details. Please try again.';
    } finally {
      loading = false;
    }
  }

  // Pass the fetched data (or error/loading state) to the client component
  return <UserDetailClient user={user} loading={loading} error={error} />;
}

