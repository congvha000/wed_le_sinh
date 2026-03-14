import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash("admin123", 10);

  // Tạo hoặc cập nhật admin
  await prisma.user.upsert({
    where: { email: "admin" },
    update: {
      passwordHash: adminHash,
      role: UserRole.ADMIN,
      isActive: true,
      approved: true,
      profileCompleted: true,
      name: "Quản trị viên",
    },
    create: {
      email: "admin",
      name: "Quản trị viên",
      passwordHash: adminHash,
      role: UserRole.ADMIN,
      isActive: true,
      approved: true,
      profileCompleted: true,
    },
  });

  // Tạo hoặc cập nhật system setting để mở đăng ký
  const existingSetting = await prisma.systemSetting.findFirst();

  if (existingSetting) {
    await prisma.systemSetting.update({
      where: { id: existingSetting.id },
      data: {
        registrationOpen: true,
      },
    });
  } else {
    await prisma.systemSetting.create({
      data: {
        registrationOpen: true,
      },
    });
  }

  console.log("Seed hoàn tất: admin + mở đăng ký");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });