import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// Create the auth handler
const handler = NextAuth(authOptions);

// Export auth handler
export { handler as GET, handler as POST };
