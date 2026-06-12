-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'PIX', 'CARD');

-- RenameTable
ALTER TABLE "TokenSale" RENAME TO "venda_fichas";

-- AlterTable
ALTER TABLE "venda_fichas" RENAME COLUMN "amountPaid" TO "total";
ALTER TABLE "venda_fichas" ALTER COLUMN "cashierId" DROP NOT NULL;
ALTER TABLE "venda_fichas" ADD COLUMN "userId" INTEGER;
ALTER TABLE "venda_fichas" ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH';
ALTER TABLE "venda_fichas" ADD COLUMN "amountReceived" DOUBLE PRECISION;
ALTER TABLE "venda_fichas" ADD COLUMN "changeAmount" DOUBLE PRECISION;

-- AddForeignKey
ALTER TABLE "venda_fichas" ADD CONSTRAINT "venda_fichas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "venda_ficha_itens" (
    "id" SERIAL NOT NULL,
    "tokenSaleId" INTEGER NOT NULL,
    "fichaValue" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "lineTotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "venda_ficha_itens_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "venda_ficha_itens" ADD CONSTRAINT "venda_ficha_itens_tokenSaleId_fkey" FOREIGN KEY ("tokenSaleId") REFERENCES "venda_fichas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
