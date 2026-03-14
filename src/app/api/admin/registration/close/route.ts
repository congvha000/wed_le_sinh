import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.systemSetting.findFirst();

    if (!existing) {
      return Response.json(
        { error: "Chưa có cấu hình hệ thống" },
        { status: 400 },
      );
    }

    await prisma.systemSetting.update({
      where: { id: existing.id },
      data: { registrationOpen: false },
    });

    return Response.json({ ok: true, registrationOpen: false });
  } catch {
    return Response.json(
      { error: "Lỗi máy chủ" },
      { status: 500 },
    );
  }
}