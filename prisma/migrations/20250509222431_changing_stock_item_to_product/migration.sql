/*
  Warnings:

  - You are about to drop the column `stockItemId` on the `StockIn` table. All the data in the column will be lost.
  - You are about to drop the column `stockItemId` on the `StockOut` table. All the data in the column will be lost.
  - You are about to drop the `StockItem` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `productId` to the `StockIn` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productId` to the `StockOut` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "StockIn" DROP CONSTRAINT "StockIn_stockItemId_fkey";

-- DropForeignKey
ALTER TABLE "StockOut" DROP CONSTRAINT "StockOut_stockItemId_fkey";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "StockIn" DROP COLUMN "stockItemId",
ADD COLUMN     "productId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "StockOut" DROP COLUMN "stockItemId",
ADD COLUMN     "productId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "StockItem";

-- AddForeignKey
ALTER TABLE "StockIn" ADD CONSTRAINT "StockIn_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOut" ADD CONSTRAINT "StockOut_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
