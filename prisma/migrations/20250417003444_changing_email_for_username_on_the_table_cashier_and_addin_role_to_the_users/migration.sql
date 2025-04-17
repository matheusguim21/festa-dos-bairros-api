/*
  Warnings:

  - You are about to drop the column `email` on the `Cashier` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `Cashier` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `username` to the `Cashier` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STALL');

-- DropIndex
DROP INDEX "Cashier_email_key";

-- AlterTable
ALTER TABLE "Cashier" DROP COLUMN "email",
ADD COLUMN     "username" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'STALL';

-- CreateIndex
CREATE UNIQUE INDEX "Cashier_username_key" ON "Cashier"("username");
