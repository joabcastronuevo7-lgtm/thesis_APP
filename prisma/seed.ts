import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Admin account
  const adminPassword = await bcrypt.hash("Admin@123456", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@examgen.com" },
    update: {},
    create: {
      id: randomUUID(),
      name: "System Admin",
      email: "admin@examgen.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  // Educator account
  const educatorPassword = await bcrypt.hash("Educator@123456", 12);
  const educator = await prisma.user.upsert({
    where: { email: "educator@examgen.com" },
    update: {},
    create: {
      id: randomUUID(),
      name: "Dr. Maria Santos",
      email: "educator@examgen.com",
      password: educatorPassword,
      role: "EDUCATOR",
    },
  });

  // Student accounts
  const studentPassword = await bcrypt.hash("Student@123456", 12);
  const student1 = await prisma.user.upsert({
    where: { email: "student1@examgen.com" },
    update: {},
    create: {
      id: randomUUID(),
      name: "Juan dela Cruz",
      email: "student1@examgen.com",
      password: studentPassword,
      role: "STUDENT",
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email: "student2@examgen.com" },
    update: {},
    create: {
      id: randomUUID(),
      name: "Ana Reyes",
      email: "student2@examgen.com",
      password: studentPassword,
      role: "STUDENT",
    },
  });

  console.log("✅ Users seeded:", { admin: admin.email, educator: educator.email });
  console.log("✅ Students:", student1.email, student2.email);
  console.log("\n📋 Login credentials:");
  console.log("  Admin:    admin@examgen.com     / Admin@123456");
  console.log("  Educator: educator@examgen.com  / Educator@123456");
  console.log("  Student:  student1@examgen.com  / Student@123456");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
