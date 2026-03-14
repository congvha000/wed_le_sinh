import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: {
        role: "USER",
        approved: false,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        profileCompleted: true,
        approved: true,
        createdAt: true,
      },
    });

    return Response.json({ ok: true, users });
  } catch {
    return Response.json(
      { error: "Lỗi máy chủ" },
      { status: 500 },
    );
  }
}