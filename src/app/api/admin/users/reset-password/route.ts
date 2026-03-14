import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { adminResetPasswordSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    const session = await requireAdmin();

    if (!session) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const json = await req.json();
    const parsed = adminResetPasswordSchema.safeParse(json);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Payload không hợp lệ" },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);

    await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { passwordHash },
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}