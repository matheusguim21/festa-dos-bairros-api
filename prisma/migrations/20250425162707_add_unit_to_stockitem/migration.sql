/*
  Warnings:

  - Added the required column `unit` to the `StockItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "StockItem" ADD COLUMN     "unit" TEXT NOT NULL;
