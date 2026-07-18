import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Test branch
  const branch = await prisma.branch.upsert({
    where: { id: "seed-branch-1" },
    update: {},
    create: {
      id: "seed-branch-1",
      name: "FünfSterne Mitte",
      address: "Hauptstraße 1",
      city: "Berlin",
      postalCode: "10115",
      phone: "+49 30 0000000",
      isActive: true,
    },
  });
  console.log(`  Branch: ${branch.id} (${branch.name})`);

  // Test discount code (no expiry, no max — easy to test happy path)
  const discount = await prisma.discountCode.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      code: "WELCOME10",
      type: "PERCENTAGE",
      value: 10,
      isActive: true,
      scopeBranchId: branch.id,
    },
  });
  console.log(`  DiscountCode: ${discount.code}`);

  // Test admin user (email: admin@funfsterne.dev / password: admin123)
  const passwordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.adminUser.upsert({
    where: { email: "admin@funfsterne.dev" },
    update: { passwordHash },
    create: {
      email: "admin@funfsterne.dev",
      passwordHash,
      name: "Dev Admin",
    },
  });
  console.log(`  AdminUser: ${admin.email}`);

  console.log("Done.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
