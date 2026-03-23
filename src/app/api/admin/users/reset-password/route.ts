import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/api-access";
import { adminResetPasswordSchema } from "@/lib/validators";

export async function POST(req: Request) {
  const authResult = await requireDbUser("ADMIN");
  if (authResult.error) return authResult.error;

  try {
    const parsed = adminResetPasswordSchema.safeParse(await req.json());

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Payload không hợp lệ" },
        { status: 400 },
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: {
        id: parsed.data.userId,
      },
      select: {
        id: true,
        role: true,
        isActive: true,
      },
    });

    if (!targetUser || targetUser.role !== "USER") {
      return Response.json({ error: "Không tìm thấy tài khoản thành viên cần đặt lại mật khẩu" }, { status: 404 });
    }

    if (!targetUser.isActive) {
      return Response.json({ error: "Tài khoản này đang bị khóa" }, { status: 400 });
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
