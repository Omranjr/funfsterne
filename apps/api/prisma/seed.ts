import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Refuses to seed anything that is not a local database.
 *
 * `npm run db:seed` reads `apps/api/.env`, which holds production Supabase
 * credentials -- so without this guard, one absent-minded invocation writes
 * test branches, fake customers and dummy loyalty history into the live
 * shop. The seed is meant for a throwaway container; this makes that
 * structural rather than a thing you have to remember.
 *
 * Set ALLOW_REMOTE_SEED=1 to override, deliberately.
 */
function assertLocalDatabase(): void {
  const url = process.env.DATABASE_URL ?? "";
  const isLocal = /@(localhost|127\.0\.0\.1|host\.docker\.internal|db):/.test(url);

  if (isLocal || process.env.ALLOW_REMOTE_SEED === "1") return;

  const host = url.replace(/^.*@/, "").replace(/\/.*$/, "") || "(unset)";
  console.error(
    [
      "",
      "  Refusing to seed: DATABASE_URL does not look local.",
      `  host: ${host}`,
      "",
      "  This script creates and overwrites data. Point it at the local",
      "  container first:",
      "",
      "    docker compose up -d db",
      "    DATABASE_URL=postgresql://funfsterne:funfsterne@localhost:5433/funfsterne \\",
      "    DIRECT_URL=postgresql://funfsterne:funfsterne@localhost:5433/funfsterne \\",
      "      npm run db:seed --workspace=apps/api",
      "",
      "  If you really mean to seed a remote database, set ALLOW_REMOTE_SEED=1.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

/** Days in the past, as a Date. Keeps the backdated fixtures readable. */
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function main() {
  assertLocalDatabase();
  console.log("Seeding database...");

  // ── Admin ────────────────────────────────────────────────────────────────
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
  console.log(`  AdminUser: ${admin.email} / admin123`);

  // ── Branches ─────────────────────────────────────────────────────────────
  // Four, one of them inactive: enough for the picker to scroll, and enough
  // to catch a list that forgets to filter on isActive.
  const branchSeeds = [
    {
      id: "seed-branch-1",
      name: "FünfSterne Mitte",
      address: "Hauptstraße 1",
      city: "Berlin",
      postalCode: "10115",
      phone: "+49 30 0000000",
      isActive: true,
    },
    {
      id: "seed-branch-2",
      name: "FünfSterne Kreuzberg",
      address: "Oranienstraße 42",
      city: "Berlin",
      postalCode: "10999",
      phone: "+49 30 1111111",
      isActive: true,
    },
    {
      id: "seed-branch-3",
      name: "FünfSterne Prenzlauer Berg",
      address: "Kastanienallee 88",
      city: "Berlin",
      postalCode: "10435",
      phone: null,
      isActive: true,
    },
    {
      id: "seed-branch-4",
      name: "FünfSterne Spandau (geschlossen)",
      address: "Klosterstraße 7",
      city: "Berlin",
      postalCode: "13581",
      phone: "+49 30 3333333",
      isActive: false,
    },
  ];

  for (const b of branchSeeds) {
    await prisma.branch.upsert({ where: { id: b.id }, update: b, create: b });
  }
  console.log(`  Branches: ${branchSeeds.length} (1 inactive)`);

  // ── Products ─────────────────────────────────────────────────────────────
  // Deliberately uneven: a very long name and a very short one, a product
  // with no description, one with no image, one inactive. The grid is
  // supposed to keep equal-height cards through all of that.
  const productSeeds = [
    {
      id: "seed-p-01",
      name: "Klassischer Herrenhaarschnitt",
      description: "Waschen, Schneiden, Styling. Inklusive Beratung.",
      category: "HAIR" as const,
      basePrice: 28.0,
      images: ["https://picsum.photos/seed/fs01/800/800"],
      isActive: true,
    },
    {
      id: "seed-p-02",
      name: "Maschinenschnitt",
      description: "Schnell und sauber, eine Länge.",
      category: "HAIR" as const,
      basePrice: 18.0,
      images: ["https://picsum.photos/seed/fs02/800/800"],
      isActive: true,
    },
    {
      id: "seed-p-03",
      name: "Premium Komplettpaket mit Haarschnitt, Bartpflege und Gesichtsbehandlung",
      description:
        "Das volle Programm: Haarschnitt nach Wunsch, klassische Bartrasur mit heißem Handtuch, Gesichtsreinigung und abschließendes Styling. Etwa 90 Minuten.",
      category: "HAIR" as const,
      basePrice: 89.9,
      images: [
        "https://picsum.photos/seed/fs03a/800/800",
        "https://picsum.photos/seed/fs03b/800/800",
      ],
      isActive: true,
    },
    {
      id: "seed-p-04",
      name: "Kinderhaarschnitt",
      // No description on purpose -- the card must not collapse.
      description: null,
      category: "HAIR" as const,
      basePrice: 15.0,
      images: ["https://picsum.photos/seed/fs04/800/800"],
      isActive: true,
    },
    {
      id: "seed-p-05",
      name: "Bartschnitt & Konturen",
      description: "Formen, kürzen, Konturen mit dem Rasiermesser.",
      category: "BEARD" as const,
      basePrice: 20.0,
      images: ["https://picsum.photos/seed/fs05/800/800"],
      isActive: true,
    },
    {
      id: "seed-p-06",
      name: "Klassische Nassrasur",
      description: "Heißes Handtuch, Rasiermesser, Aftershave-Balsam.",
      category: "BEARD" as const,
      basePrice: 25.0,
      images: ["https://picsum.photos/seed/fs06/800/800"],
      isActive: true,
    },
    {
      id: "seed-p-07",
      name: "Bartöl",
      description: "100 ml, Sandelholz.",
      category: "BEARD" as const,
      basePrice: 14.5,
      // No image on purpose -- the placeholder path needs exercising.
      images: [],
      isActive: true,
    },
    {
      id: "seed-p-08",
      name: "Gesichtsbehandlung Deluxe",
      description: "Reinigung, Peeling, Maske, Massage.",
      category: "SKIN_CARE" as const,
      basePrice: 45.0,
      images: ["https://picsum.photos/seed/fs08/800/800"],
      isActive: true,
    },
    {
      id: "seed-p-09",
      name: "Augenbrauen zupfen",
      description: "Formen und korrigieren.",
      category: "SKIN_CARE" as const,
      basePrice: 12.0,
      images: ["https://picsum.photos/seed/fs09/800/800"],
      isActive: true,
    },
    {
      id: "seed-p-10",
      name: "Gesichtsmaske Aktivkohle",
      description: "Für unreine Haut, 50 ml.",
      category: "SKIN_CARE" as const,
      basePrice: 19.9,
      images: ["https://picsum.photos/seed/fs10/800/800"],
      isActive: true,
    },
    {
      id: "seed-p-11",
      name: "Profi-Haarschneidemaschine",
      description: "Netzbetrieb, 8 Aufsätze.",
      category: "TOOLS" as const,
      basePrice: 129.0,
      images: ["https://picsum.photos/seed/fs11/800/800"],
      isActive: true,
    },
    {
      id: "seed-p-12",
      name: "Rasiermesser Set",
      description: "Rasiermesser, Streichriemen, 10 Klingen.",
      category: "TOOLS" as const,
      basePrice: 64.0,
      images: ["https://picsum.photos/seed/fs12/800/800"],
      isActive: true,
    },
    {
      id: "seed-p-13",
      name: "Gutschein 50 €",
      description: "Einlösbar in allen Filialen.",
      category: "OTHER" as const,
      basePrice: 50.0,
      images: ["https://picsum.photos/seed/fs13/800/800"],
      isActive: true,
    },
    {
      id: "seed-p-14",
      name: "Altes Angebot (deaktiviert)",
      description: "Sollte im Shop nicht auftauchen.",
      category: "OTHER" as const,
      basePrice: 9.99,
      images: [],
      isActive: false,
    },
  ];

  for (const p of productSeeds) {
    await prisma.product.upsert({ where: { id: p.id }, update: p, create: p });
  }
  console.log(`  Products: ${productSeeds.length} (1 inactive, 1 imageless, 1 without description)`);

  // Availability: most products everywhere, a couple restricted or priced
  // differently per branch, one explicitly out of stock.
  const activeBranchIds = branchSeeds.filter((b) => b.isActive).map((b) => b.id);
  for (const p of productSeeds) {
    for (const branchId of activeBranchIds) {
      const restricted = p.id === "seed-p-11" && branchId !== "seed-branch-1";
      if (restricted) continue;

      const data = {
        productId: p.id,
        branchId,
        inStock: !(p.id === "seed-p-12" && branchId === "seed-branch-2"),
        priceOverride:
          p.id === "seed-p-01" && branchId === "seed-branch-3" ? 31.5 : null,
      };
      await prisma.productBranchAvailability.upsert({
        where: { productId_branchId: { productId: p.id, branchId } },
        update: data,
        create: data,
      });
    }
  }
  console.log("  Availability: per-branch rows (1 out of stock, 1 price override, 1 branch-exclusive)");

  // ── Category images ──────────────────────────────────────────────────────
  const categories = ["HAIR", "SKIN_CARE", "BEARD", "TOOLS", "OTHER"] as const;
  for (const category of categories) {
    await prisma.categoryImage.upsert({
      where: { category },
      update: { imageUrl: `https://picsum.photos/seed/cat-${category}/1200/800` },
      create: {
        category,
        imageUrl: `https://picsum.photos/seed/cat-${category}/1200/800`,
      },
    });
  }
  console.log(`  CategoryImages: ${categories.length}`);

  // ── Discount codes ───────────────────────────────────────────────────────
  // One of each state the redemption path and the retention sweep care about.
  const codeSeeds = [
    {
      code: "WELCOME10",
      type: "PERCENTAGE" as const,
      value: 10,
      expiresAt: null,
      maxRedemptions: null,
      currentRedemptions: 0,
      isActive: true,
      scopeBranchId: "seed-branch-1",
      note: "evergreen, branch-scoped",
    },
    {
      code: "SOMMER25",
      type: "PERCENTAGE" as const,
      value: 25,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      maxRedemptions: null,
      currentRedemptions: 0,
      isActive: true,
      scopeBranchId: null,
      note: "live, expires in 30 days",
    },
    {
      code: "FUENFEURO",
      type: "FIXED" as const,
      value: 5,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      maxRedemptions: 10,
      currentRedemptions: 4,
      isActive: true,
      scopeBranchId: null,
      note: "live, 4 of 10 used",
    },
    {
      code: "LIMITED3",
      type: "PERCENTAGE" as const,
      value: 30,
      expiresAt: null,
      maxRedemptions: 3,
      currentRedemptions: 3,
      isActive: true,
      scopeBranchId: null,
      note: "fully redeemed -- must not appear in the app",
    },
    {
      code: "FRUEHLING20",
      type: "PERCENTAGE" as const,
      value: 20,
      expiresAt: daysAgo(420),
      maxRedemptions: null,
      currentRedemptions: 2,
      isActive: true,
      scopeBranchId: null,
      note: "expired 14 months ago -- retention sweep target",
    },
    {
      code: "ALTAKTION",
      type: "FIXED" as const,
      value: 8,
      expiresAt: null,
      maxRedemptions: null,
      currentRedemptions: 1,
      isActive: false,
      scopeBranchId: null,
      note: "switched off -- retention sweep target",
    },
  ];

  const codeIds: Record<string, string> = {};
  for (const { note, ...c } of codeSeeds) {
    const row = await prisma.discountCode.upsert({
      where: { code: c.code },
      update: c,
      create: c,
    });
    codeIds[c.code] = row.id;
    console.log(`  DiscountCode: ${c.code.padEnd(12)} ${note}`);
  }

  // ── Consumer users ───────────────────────────────────────────────────────
  const consumerHash = await bcrypt.hash("test1234", 10);
  const userSeeds = [
    { id: "seed-u-1", firstName: "Ahmad", lastName: "Karim", username: "ahmad", loyaltyPoints: 340 },
    { id: "seed-u-2", firstName: "Lena", lastName: "Vogt", username: "lena", loyaltyPoints: 80 },
    { id: "seed-u-3", firstName: "Mert", lastName: "Yilmaz", username: "mert", loyaltyPoints: 0 },
    { id: "seed-u-4", firstName: "Sofia", lastName: "Bauer", username: "sofia", loyaltyPoints: 1250 },
    { id: "seed-u-5", firstName: "Jonas", lastName: "Weber", username: "jonas", loyaltyPoints: 45 },
  ];

  for (const u of userSeeds) {
    await prisma.consumerUser.upsert({
      where: { id: u.id },
      update: { ...u, passwordHash: consumerHash },
      create: { ...u, passwordHash: consumerHash },
    });
  }
  console.log(`  ConsumerUsers: ${userSeeds.length} (password: test1234) -- incl. one with 0 points`);

  // ── Loyalty history ──────────────────────────────────────────────────────
  // Spread across months so the visit-stats granularity switches have real
  // data to bucket, and one user (mert) deliberately has none.
  await prisma.loyaltyTransaction.deleteMany({
    where: { userId: { in: userSeeds.map((u) => u.id) } },
  });

  const txSeeds: Array<{
    userId: string;
    branchId: string;
    points: number;
    type: "EARN" | "REDEEM";
    note: string | null;
    createdAt: Date;
  }> = [
    { userId: "seed-u-1", branchId: "seed-branch-1", points: 50, type: "EARN", note: "Haarschnitt", createdAt: daysAgo(240) },
    { userId: "seed-u-1", branchId: "seed-branch-1", points: 50, type: "EARN", note: "Haarschnitt", createdAt: daysAgo(180) },
    { userId: "seed-u-1", branchId: "seed-branch-2", points: 90, type: "EARN", note: "Komplettpaket", createdAt: daysAgo(95) },
    { userId: "seed-u-1", branchId: "seed-branch-1", points: 50, type: "EARN", note: "Haarschnitt", createdAt: daysAgo(40) },
    { userId: "seed-u-1", branchId: "seed-branch-1", points: 100, type: "EARN", note: "Haarschnitt + Bart", createdAt: daysAgo(9) },
    { userId: "seed-u-2", branchId: "seed-branch-2", points: 40, type: "EARN", note: "Bartschnitt", createdAt: daysAgo(60) },
    { userId: "seed-u-2", branchId: "seed-branch-2", points: 40, type: "EARN", note: "Bartschnitt", createdAt: daysAgo(20) },
    { userId: "seed-u-4", branchId: "seed-branch-1", points: 500, type: "EARN", note: "Stammkunde", createdAt: daysAgo(300) },
    { userId: "seed-u-4", branchId: "seed-branch-3", points: 500, type: "EARN", note: "Stammkunde", createdAt: daysAgo(150) },
    { userId: "seed-u-4", branchId: "seed-branch-1", points: 500, type: "EARN", note: "Stammkunde", createdAt: daysAgo(30) },
    { userId: "seed-u-4", branchId: "seed-branch-1", points: -250, type: "REDEEM", note: "Gutschein 25 €", createdAt: daysAgo(25) },
    { userId: "seed-u-5", branchId: "seed-branch-3", points: 45, type: "EARN", note: "Kinderhaarschnitt", createdAt: daysAgo(3) },
  ];
  await prisma.loyaltyTransaction.createMany({ data: txSeeds });
  console.log(`  LoyaltyTransactions: ${txSeeds.length} across ${new Set(txSeeds.map((t) => t.userId)).size} users`);

  // One spent voucher and one still outstanding.
  await prisma.loyaltyReward.deleteMany({
    where: { userId: { in: userSeeds.map((u) => u.id) } },
  });
  await prisma.loyaltyReward.createMany({
    data: [
      {
        id: "seed-r-1",
        userId: "seed-u-4",
        eurosValue: 25,
        pointsSpent: 250,
        status: "REDEEMED",
        createdAt: daysAgo(26),
        redeemedAt: daysAgo(25),
        redeemedByBranchId: "seed-branch-1",
      },
      {
        id: "seed-r-2",
        userId: "seed-u-1",
        eurosValue: 10,
        pointsSpent: 100,
        status: "ACTIVE",
        createdAt: daysAgo(4),
      },
    ],
  });
  console.log("  LoyaltyRewards: 1 ACTIVE, 1 REDEEMED");

  // ── Push tokens ──────────────────────────────────────────────────────────
  // Two current, one stale. The stale one is the retention sweep's target,
  // and is backdated with raw SQL because `@updatedAt` overwrites whatever
  // the client passes.
  await prisma.pushToken.deleteMany({ where: { deviceId: { startsWith: "seed-device-" } } });
  await prisma.pushToken.createMany({
    data: [
      { id: "seed-t-1", deviceId: "seed-device-1", userId: "seed-u-1", token: "ExponentPushToken[seed-fresh-0001]", platform: "IOS" },
      { id: "seed-t-2", deviceId: "seed-device-2", userId: "seed-u-2", token: "ExponentPushToken[seed-fresh-0002]", platform: "ANDROID" },
      { id: "seed-t-3", deviceId: "seed-device-3", userId: "seed-u-5", token: "ExponentPushToken[seed-stale-0003]", platform: "ANDROID" },
    ],
  });
  await prisma.$executeRaw`UPDATE "PushToken" SET "updatedAt" = NOW() - INTERVAL '400 days' WHERE "id" = 'seed-t-3'`;
  console.log("  PushTokens: 3 (1 backdated 400 days -- retention sweep target)");

  // ── Redemptions ──────────────────────────────────────────────────────────
  // Old rows on finished codes (should sweep) and an old row on the evergreen
  // code (must be held back, because that code can still be redeemed).
  await prisma.discountCodeRedemption.deleteMany({
    where: { deviceId: { startsWith: "seed-device-" } },
  });
  await prisma.discountCodeRedemption.createMany({
    data: [
      { deviceId: "seed-device-1", userId: "seed-u-1", branchId: "seed-branch-1", discountCodeId: codeIds.FRUEHLING20, redeemedAt: daysAgo(430) },
      { deviceId: "seed-device-2", userId: "seed-u-2", branchId: "seed-branch-2", discountCodeId: codeIds.FRUEHLING20, redeemedAt: daysAgo(425) },
      { deviceId: "seed-device-3", userId: "seed-u-5", branchId: "seed-branch-1", discountCodeId: codeIds.ALTAKTION, redeemedAt: daysAgo(410) },
      { deviceId: "seed-device-4", userId: "seed-u-4", branchId: "seed-branch-1", discountCodeId: codeIds.WELCOME10, redeemedAt: daysAgo(400) },
      { deviceId: "seed-device-5", userId: null, branchId: "seed-branch-2", discountCodeId: codeIds.FUENFEURO, redeemedAt: daysAgo(2) },
    ],
  });
  console.log("  Redemptions: 5 (3 sweepable, 1 held by evergreen code, 1 recent)");

  // ── Notification history ─────────────────────────────────────────────────
  await prisma.notification.deleteMany({ where: { title: { startsWith: "[seed]" } } });
  await prisma.notification.createMany({
    data: [
      { title: "[seed] Sommeraktion gestartet", body: "25 % auf alle Haarschnitte bis Ende des Monats.", discountCodeId: codeIds.SOMMER25, audience: "ALL", sentAt: daysAgo(12), sentToCount: 3 },
      { title: "[seed] Neue Filiale in Kreuzberg", body: "Ab sofort auch in der Oranienstraße.", discountCodeId: null, audience: "ALL", sentAt: daysAgo(45), sentToCount: 2 },
      { title: "[seed] Treuepunkte-Erinnerung", body: "Du hast genug Punkte für einen Gutschein.", discountCodeId: null, audience: "SEGMENT", sentAt: daysAgo(5), sentToCount: 1 },
    ],
  });
  console.log("  Notifications: 3 historical");

  console.log("\nDone. Admin: admin@funfsterne.dev / admin123");
  console.log("Consumers: ahmad, lena, mert, sofia, jonas -- all password test1234");
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
