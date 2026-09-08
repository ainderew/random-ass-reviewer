import { DrizzleAdapter } from '@auth/drizzle-adapter';
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { env } from '@/lib/env';
import { db } from '@/server/db';
import {
  accounts,
  authSessions,
  users,
  verificationTokens,
} from '@/server/db/schema';
import { createUserWithDefaults } from '@/server/services/user-bootstrap';

const adapter = DrizzleAdapter(db, {
  usersTable: users,
  accountsTable: accounts,
  sessionsTable: authSessions,
  verificationTokensTable: verificationTokens,
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: { ...adapter, createUser: createUserWithDefaults },
  providers: [
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    }),
  ],
  secret: env.AUTH_SECRET,
  // The landing page hosts the sign-in button and reads `?error=` inline.
  pages: { signIn: '/', error: '/' },
  callbacks: {
    // Every service needs the user id, so put it on the session once here.
    session: ({ session, user }) => {
      session.user.id = user.id;
      return session;
    },
  },
});
