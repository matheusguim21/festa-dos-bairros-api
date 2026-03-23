-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'AWAITING_PAYMENT';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "mercadoPagoPaymentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_mercadoPagoPaymentId_key" ON "Order"("mercadoPagoPaymentId");

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "pickupToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_pickupToken_key" ON "OrderItem"("pickupToken");
