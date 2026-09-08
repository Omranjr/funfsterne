import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Matches the row the `add_multi_tenancy` migration inserts, so seeding a
// database that has already been migrated updates that tenant rather than
// creating a second Fünf Sterne alongside it.
const TENANT_ID = "tnt_funfsterne";
const TENANT_SLUG = "funfsterne";

async function main() {
  console.log("Seeding database...");

  // The tenant every other row below belongs to. Everything in this script
  // is scoped to it: seeding must not be the one place that can create
  // unowned data.
  const tenant = await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {},
    create: {
      id: TENANT_ID,
      slug: TENANT_SLUG,
      name: "Fünf Sterne",
      plan: "ENTERPRISE",
      isActive: true,
    },
  });
  console.log(`  Tenant: ${tenant.slug} (${tenant.name})`);

  const branch = await prisma.branch.upsert({
    where: { id: "seed-branch-1" },
    update: {},
    create: {
      id: "seed-branch-1",
      tenantId: tenant.id,
      name: "FünfSterne Mitte",
      address: "Hauptstraße 1",
      city: "Berlin",
      postalCode: "10115",
      phone: "+49 30 0000000",
      isActive: true,
    },
  });
  console.log(`  Branch: ${branch.id} (${branch.name})`);

  // Test discount code (no expiry, no max — easy to test happy path).
  // Looked up by (tenantId, code) now that `code` is only unique per tenant.
  const discount = await prisma.discountCode.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "WELCOME10" } },
    update: {},
    create: {
      tenantId: tenant.id,
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
    where: {
      tenantId_email: { tenantId: tenant.id, email: "admin@funfsterne.dev" },
    },
    update: { passwordHash },
    create: {
      tenantId: tenant.id,
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
