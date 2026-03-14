import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

export type CurrentUserContext = {
  session: Session | null;
  user: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    role: "ADMIN" | "USER";
    approved: boolean;
    profileCompleted: boolean;
    hasPair: boolean;
    pairName: string | null;
    pairLevel: string | null;
  } | null;
  nextPath: string;
};

export async function getUserContext(): Promise<CurrentUserContext> {
  const session = await auth();

  if (!session?.user?.email) {
    return {
      session,
      user: null,
      nextPath: "/login",
    };
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      pairMembers: {
        include: {
          pair: true,
        },
      },
    },
  });

  if (!dbUser) {
    return {
      session,
      user: null,
      nextPath: "/login",
    };
  }

  const firstPair = dbUser.pairMembers[0]?.pair ?? null;

  let nextPath = "/dashboard";

  if (dbUser.role === "ADMIN") {
    nextPath = "/admin";
  } else if (!dbUser.profileCompleted) {
    nextPath = "/complete-profile";
  } else if (!dbUser.approved) {
    nextPath = "/pending-approval";
  } else if (!firstPair) {
    nextPath = "/waiting-pair";
  }

  return {
    session,
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      phone: dbUser.phone,
      role: dbUser.role,
      approved: dbUser.approved,
      profileCompleted: dbUser.profileCompleted,
      hasPair: Boolean(firstPair),
      pairName: firstPair?.name ?? null,
      pairLevel: firstPair?.level ?? null,
    },
    nextPath,
  };
}