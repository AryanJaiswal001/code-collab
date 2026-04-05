import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

if (process.env.VERCEL) {
  process.env.AUTH_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : `https://${process.env.VERCEL_URL}`;
  process.env.NEXTAUTH_URL = process.env.AUTH_URL;
}

function getProfileString(profile: unknown, key: string) {
  if (!profile || typeof profile !== "object") {
    return null;
  }

  const value = (profile as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function getEmailHandle(email?: string | null) {
  if (!email) {
    return null;
  }

  const [localPart] = email.split("@");
  return localPart?.trim() || null;
}

function resolveUsername(params: {
  profile: unknown;
  provider?: string;
  email?: string | null;
  existingUsername?: string | null;
}) {
  const { profile, provider, email, existingUsername } = params;

  if (existingUsername) {
    return existingUsername;
  }

  if (provider === "github") {
    return getProfileString(profile, "login") ?? getEmailHandle(email);
  }

  return (
    getProfileString(profile, "preferred_username") ??
    getProfileString(profile, "login") ??
    getEmailHandle(email)
  );
}

function resolveAvatarUrl(profile: unknown, fallback?: string | null) {
  return (
    getProfileString(profile, "avatar_url") ??
    getProfileString(profile, "picture") ??
    fallback ??
    null
  );
}

export const authConfig = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/auth/sign-in",
    error: "/auth/error",
  },
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      try {
        const targetUrl = new URL(url);
        if (targetUrl.origin === baseUrl) {
          return url;
        }
      } catch {
        return baseUrl;
      }

      return baseUrl;
    },
    jwt({ token, user, account, profile }) {
      const username = resolveUsername({
        profile,
        provider: account?.provider,
        email: user?.email ?? token.email,
        existingUsername:
          typeof token.username === "string" ? token.username : null,
      });

      if (username) {
        token.username = username;
      }

      if (user?.id) {
        token.sub = user.id;
      }

      const avatarUrl = resolveAvatarUrl(
        profile,
        user?.image ??
          (typeof token.picture === "string" ? token.picture : null),
      );

      if (avatarUrl) {
        token.picture = avatarUrl;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? session.user.id ?? "";
        session.user.username =
          typeof token.username === "string" ? token.username : null;

        if (typeof token.picture === "string") {
          session.user.image = token.picture;
        }
      }

      return session;
    },
  },
} satisfies NextAuthConfig;
