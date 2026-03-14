import { auth } from "@/lib/auth";

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return null;
  }

  return session;
}