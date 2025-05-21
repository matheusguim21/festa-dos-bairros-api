/*
  Warnings:

  - You are about to drop the column `userId` on the `Stall` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Stall" DROP CONSTRAINT "Stall_userId_fkey";

-- DropIndex
DROP INDEX "Stall_userId_key";

-- AlterTable
ALTER TABLE "Stall" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "stallId" INTEGER;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_stallId_fkey" FOREIGN KEY ("stallId") REFERENCES "Stall"("id") ON DELETE SET NULL ON UPDATE CASCADE;
