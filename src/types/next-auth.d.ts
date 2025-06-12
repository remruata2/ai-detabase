import { DefaultSession, DefaultUser } from 'next-auth';
import { UserRole } from '@prisma/client';

declare module 'next-auth' {
  /**
   * The shape of the user object returned in the OAuth providers' `profile` callback,
   * or the second parameter of the `session` callback, when using a database.
   */
  interface User extends DefaultUser {
    id: string;
    name?: string | null;
    email: string;
    image?: string | null;
    role: UserRole;
  }

  /**
   * The shape of the session object we'll get when calling `getSession` or `useSession`.
   */
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  /**
   * The shape of the JWT object we'll get when calling `getToken`.
   */
  interface JWT {
    id: string;
    role: UserRole;
  }
}
