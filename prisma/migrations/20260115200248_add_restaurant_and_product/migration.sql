-- AlterTable
ALTER TABLE "User" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "role" SET DEFAULT 'MERCHANT';

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "restaurantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Restaurant_ownerId_idx" ON "Restaurant"("ownerId");

-- CreateIndex
CREATE INDEX "Product_restaurantId_idx" ON "Product"("restaurantId");

-- AddForeignKey
ALTER TABLE "Restaurant" ADD CONSTRAINT "Restaurant_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
