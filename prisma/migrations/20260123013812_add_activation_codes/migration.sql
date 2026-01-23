-- CreateEnum
CREATE TYPE "ActivationCodePlan" AS ENUM ('monthly', 'yearly');

-- CreateTable
CREATE TABLE "ActivationCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "plan" "ActivationCodePlan" NOT NULL,
    "days" INTEGER NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivationCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActivationCode_code_key" ON "ActivationCode"("code");

-- CreateIndex
CREATE INDEX "ActivationCode_plan_idx" ON "ActivationCode"("plan");

-- CreateIndex
CREATE INDEX "ActivationCode_usedAt_idx" ON "ActivationCode"("usedAt");

-- CreateIndex
CREATE INDEX "ActivationCode_usedById_idx" ON "ActivationCode"("usedById");

-- AddForeignKey
ALTER TABLE "ActivationCode" ADD CONSTRAINT "ActivationCode_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
