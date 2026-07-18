-- CreateTable
CREATE TABLE "CategoryImage" (
    "category" "ProductCategory" NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryImage_category_key" ON "CategoryImage"("category");
