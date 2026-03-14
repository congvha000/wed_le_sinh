import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.systemSetting.findFirst();

    if (existing) {
      await prisma.systemSetting.update({
        where: { id: existing.id },
        data: { registrationOpen: true },
      });
    } else {
      await prisma.systemSetting.create({
        data: { registrationOpen: true },
      });
    }

    return Response.json({ ok: true, registrationOpen: true });
  } catch {
    return Response.json(
      { error: "Lỗi máy chủ" },
      { status: 500 },
    );
  }
}