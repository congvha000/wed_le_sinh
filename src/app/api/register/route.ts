import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = registerSchema.safeParse(json);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const setting = await prisma.systemSetting.findFirst();

    if (!setting?.registrationOpen) {
      return Response.json(
        { error: "Đăng ký hiện đang đóng" },
        { status: 403 },
      );
    }

    const email = parsed.data.email.trim().toLowerCase();

    const existed = await prisma.user.findUnique({
      where: { email },
    });

    if (existed) {
      return Response.json(
        { error: "Email đã tồn tại" },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "USER",
        approved: false,
        profileCompleted: false,
      },
    });

    return Response.json({
      ok: true,
      userId: user.id,
      message: "Đăng ký thành công",
    });
  } catch {
    return Response.json(
      { error: "Lỗi máy chủ" },
      { status: 500 },
    );
  }
}