-- DropForeignKey
ALTER TABLE "PushToken" DROP CONSTRAINT "PushToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "DiscountCodeRedemption" DROP CONSTRAINT "DiscountCodeRedemption_userId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_preferredBranchId_fkey";

-- DropIndex
DROP INDEX "PushToken_userId_idx";

-- DropIndex
DROP INDEX "DiscountCodeRedemption_userId_idx";

-- DropIndex
DROP INDEX "DiscountCodeRedemption_userId_discountCodeId_key";

-- DropIndex
DROP INDEX "User_preferredBranchId_idx";

-- DropIndex
DROP INDEX "User_phone_key";

-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "PushToken" DROP COLUMN "userId",
ADD COLUMN     "deviceId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "DiscountCodeRedemption" DROP COLUMN "userId",
ADD COLUMN     "deviceId" TEXT NOT NULL,
ADD COLUMN     "branchId" TEXT;

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "MagicLink";

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_deviceId_token_key" ON "PushToken"("deviceId", "token");

-- CreateIndex
CREATE INDEX "PushToken_deviceId_idx" ON "PushToken"("deviceId");

-- CreateIndex
CREATE INDEX "DiscountCodeRedemption_deviceId_idx" ON "DiscountCodeRedemption"("deviceId");

-- CreateIndex
CREATE INDEX "DiscountCodeRedemption_branchId_idx" ON "DiscountCodeRedemption"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCodeRedemption_deviceId_discountCodeId_key" ON "DiscountCodeRedemption"("deviceId", "discountCodeId");

-- AddForeignKey
ALTER TABLE "DiscountCodeRedemption" ADD CONSTRAINT "DiscountCodeRedemption_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
