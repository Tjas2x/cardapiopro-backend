-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CARD_CREDIT', 'CARD_DEBIT', 'CASH');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cashChangeForCents" INTEGER,
ADD COLUMN     "paid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'PIX';

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_paymentMethod_idx" ON "Order"("paymentMethod");
