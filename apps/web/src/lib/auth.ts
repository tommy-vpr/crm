import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@cultivated-crm/db";
import type { UserRole } from "@cultivated-crm/shared";
import authConfig from "./auth.config";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      name: string;
      email: string;
      image?: string;
    };
  }
}

const LAST_ACTIVE_THROTTLE_MS = 5 * 60 * 1000;
const lastActiveCache = new Map<string, number>();

function maybeUpdateLastActive(userId: string) {
  const now = Date.now();
  const last = lastActiveCache.get(userId) ?? 0;
  if (now - last < LAST_ACTIVE_THROTTLE_MS) return;

  lastActiveCache.set(userId, now);

  prisma.user
    .update({ where: { id: userId }, data: { lastActiveAt: new Date() } })
    .catch((err: Error) => {
      console.error("[auth] lastActiveAt update failed:", err.message);
    });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },

  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  trustHost: true,

  callbacks: {
    // Runs on sign-in + every request. Embeds id/role into JWT.
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id!;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id! },
          select: { role: true },
        });
        token.role = (dbUser?.role as UserRole) ?? "MEMBER";
      }

      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, name: true, image: true },
        });
        if (dbUser) {
          token.role = dbUser.role as UserRole;
          if (dbUser.name) token.name = dbUser.name;
          if (dbUser.image) token.picture = dbUser.image;
        }
      }

      return token;
    },

    // Reads from JWT token — zero DB queries
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as UserRole;
      session.user.name = (token.name as string) ?? session.user.name ?? "";
      if (token.picture) session.user.image = token.picture as string;

      maybeUpdateLastActive(token.id as string);

      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
});
