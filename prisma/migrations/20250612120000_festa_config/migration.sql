-- CreateTable
CREATE TABLE "FestaConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "festivalDay1" TEXT NOT NULL,
    "festivalDay2" TEXT NOT NULL,
    "evolutionApiKey" TEXT,
    "evolutionInstanceName" TEXT,
    "criticalStockAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FestaConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FestaAlertPhone" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FestaAlertPhone_pkey" PRIMARY KEY ("id")
);

-- Seed default festa config
INSERT INTO "FestaConfig" ("id", "festivalDay1", "festivalDay2", "criticalStockAlertsEnabled", "updatedAt")
VALUES (1, '2026-06-12', '2026-06-13', true, CURRENT_TIMESTAMP);
