import type { NextAuthConfig } from "next-auth";

const authConfig = {
  providers: [],
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;

export default authConfig;
