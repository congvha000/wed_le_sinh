import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "admin" },
    update: {},
    create: {
      email: "admin",
      name: "Quản trị viên",
      passwordHash: adminHash,
      role: UserRole.ADMIN,
      approved: true,
      profileCompleted: true,
    },
  });

  console.log("Seed hoàn tất");
}

main().finally(async () => {
  await prisma.$disconnect();
});
