import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/api-access";

export async function POST(req: Request) {
  const authResult = await requireDbUser();
  if (authResult.error) return authResult.error;

  try {
    const { currentPassword, newPassword, confirmPassword } = await req.json();
    const current = String(currentPassword ?? "");
    const next = String(newPassword ?? "");
    const confirm = String(confirmPassword ?? "");

    if (!current || !next || !confirm) return Response.json({ error: "Vui lòng nhập đầy đủ các trường" }, { status: 400 });
    if (next.length < 6) return Response.json({ error: "Mật khẩu mới phải có ít nhất 6 ký tự" }, { status: 400 });
    if (next !== confirm) return Response.json({ error: "Xác nhận mật khẩu mới không khớp" }, { status: 400 });

    const dbUser = await prisma.user.findUnique({ where: { id: authResult.user.id } });
    if (!dbUser?.passwordHash) return Response.json({ error: "Không thể xác thực tài khoản" }, { status: 400 });

    const ok = await bcrypt.compare(current, dbUser.passwordHash);
    if (!ok) return Response.json({ error: "Mật khẩu hiện tại không đúng" }, { status: 400 });

    const sameAsOld = await bcrypt.compare(next, dbUser.passwordHash);
    if (sameAsOld) return Response.json({ error: "Mật khẩu mới không được trùng mật khẩu cũ" }, { status: 400 });

    const passwordHash = await bcrypt.hash(next, 10);
    await prisma.user.update({ where: { id: dbUser.id }, data: { passwordHash } });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Không thể đổi mật khẩu" }, { status: 500 });
  }
}
