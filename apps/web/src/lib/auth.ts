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

async function provisionNewUser(userId: string, name: string) {
  try {
    await prisma.$transaction(async (tx: any) => {
      const team = await tx.team.create({
        data: { name: `${name}'s Team` },
      });

      await tx.teamMember.create({
        data: { userId, teamId: team.id, role: "LEAD" },
      });

      await tx.pipeline.create({
        data: {
          name: "Sales Pipeline",
          isDefault: true,
          teamId: team.id,
          createdById: userId,
          stages: {
            create: [
              { name: "Lead", position: 0, color: "#6B7280", probability: 10 },
              {
                name: "Qualified",
                position: 1,
                color: "#3B82F6",
                probability: 25,
              },
              {
                name: "Proposal",
                position: 2,
                color: "#8B5CF6",
                probability: 50,
              },
              {
                name: "Negotiation",
                position: 3,
                color: "#F59E0B",
                probability: 75,
              },
              {
                name: "Closed Won",
                position: 4,
                color: "#10B981",
                probability: 100,
                isWon: true,
              },
              {
                name: "Closed Lost",
                position: 5,
                color: "#EF4444",
                probability: 0,
                isLost: true,
              },
            ],
          },
        },
      });
    });
    console.log(`[auth] Provisioned team + pipeline for user ${userId}`);
  } catch (err) {
    console.error("[auth] Failed to provision new user:", err);
  }
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

  secret: process.env.AUTH_SECRET ?? process.env.AUTH_SECRET,
  trustHost: true,

  callbacks: {
    // Runs on sign-in + every request. Embeds id/role into JWT.
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id!;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id! },
          select: { role: true, teamMemberships: { select: { id: true } } },
        });
        token.role = (dbUser?.role as UserRole) ?? "MEMBER";

        // Auto-provision team + pipeline on first sign-in
        if (!dbUser?.teamMemberships?.length) {
          await provisionNewUser(user.id!, user.name ?? user.email ?? "My");
        }
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
