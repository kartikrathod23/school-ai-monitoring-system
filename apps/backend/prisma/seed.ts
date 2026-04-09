import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { userCode: "ADM_001" },
    update: {},
    create: {
      userCode: "ADM_001",
      role: "ADMIN",
      mobileNumber: "9999999999",
      passwordHash: hashedPassword,
      status: "ACTIVE",
    },
  });

  console.log("Admin created:", admin);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());