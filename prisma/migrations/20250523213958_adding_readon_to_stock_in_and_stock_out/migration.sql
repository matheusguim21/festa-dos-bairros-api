/*
  Warnings:

  - Added the required column `reason` to the `StockIn` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reason` to the `StockOut` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StockIn" ADD COLUMN     "reason" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "StockOut" ADD COLUMN     "reason" TEXT NOT NULL;
