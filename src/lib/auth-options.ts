import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import Auth0Provider from "next-auth/providers/auth0";
import { compare } from "bcryptjs";
import { db } from "./db";
// Import UserRole from the generated Prisma client
import { UserRole } from "../generated/prisma";

// Define custom types for NextAuth
type AppUser = {
	id: string;
	role: UserRole;
	username: string;
	email: string;
	name?: string;
};

declare module "next-auth" {
	interface User extends AppUser {}

	interface Session {
		user: AppUser;
	}
}

declare module "next-auth/jwt" {
	interface JWT extends AppUser {}
}

export const authOptions: NextAuthOptions = {
	providers: [
		CredentialsProvider({
			name: "Credentials",
			credentials: {
				username: { label: "Username", type: "text" },
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials) {
				if (!credentials?.username || !credentials?.password) {
					return null;
				}

				const user = await db.user.findUnique({
					where: {
						username: credentials.username,
					},
				});

				if (!user || !user.password_hash) {
					return null;
				}

				const isPasswordValid = await compare(
					credentials.password,
					user.password_hash
				);

				if (!isPasswordValid) {
					return null;
				}

				return {
					id: String(user.id),
					username: user.username!,
					role: user.role,
					email: user.email || user.username!,
					name: user.username,
				};
			},
		}),
		Auth0Provider({
			clientId: process.env.AUTH0_CLIENT_ID!,
			clientSecret: process.env.AUTH0_CLIENT_SECRET!,
			issuer: process.env.AUTH0_ISSUER!,
		}),
	],
	callbacks: {
		async signIn({ user, account }) {
			if (account?.provider === 'auth0') {
				// Find or create user for Auth0
				let dbUser = await db.user.findUnique({
					where: { auth0_id: user.id },
				});
				if (!dbUser) {
					dbUser = await db.user.create({
						data: {
							auth0_id: user.id,
							email: user.email,
							role: 'public',
							auth_provider: 'auth0',
							username: user.email, // Use email as username for Auth0 users
						},
					});
				}
				user.id = String(dbUser.id);
				user.role = dbUser.role;
				user.username = dbUser.username || dbUser.email!;
			}
			return true;
		},
		async jwt({ token, user }) {
			if (user) {
				token.id = user.id;
				token.role = user.role;
				token.username = user.username;
				token.email = user.email;
			}
			return token;
		},
		async session({ session, token }) {
			if (token && session.user) {
				session.user.id = token.id;
				session.user.role = token.role as UserRole;
				session.user.username = token.username;
				session.user.email = token.email!;
			}
			return session;
		},
	},
	pages: {
		signIn: "/login",
		error: "/login",
	},
	session: {
		strategy: "jwt",
		maxAge: 30 * 24 * 60 * 60, // 30 days
	},
	debug: process.env.NODE_ENV !== "production" && process.env.NEXTAUTH_DEBUG === "true",
	secret: process.env.NEXTAUTH_SECRET,
};

// UserRole is now imported from @prisma/client
