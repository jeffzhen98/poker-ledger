-- CreateEnum
CREATE TYPE "ChipColor" AS ENUM ('WHITE', 'BLUE', 'RED', 'GREEN', 'BLACK');

-- CreateTable
CREATE TABLE "Table" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Denominations" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "white" INTEGER NOT NULL DEFAULT 1,
    "blue" INTEGER NOT NULL DEFAULT 5,
    "red" INTEGER NOT NULL DEFAULT 10,
    "green" INTEGER NOT NULL DEFAULT 25,
    "black" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "Denominations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyIn" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuyIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EndChipCounts" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "white" INTEGER NOT NULL DEFAULT 0,
    "blue" INTEGER NOT NULL DEFAULT 0,
    "red" INTEGER NOT NULL DEFAULT 0,
    "green" INTEGER NOT NULL DEFAULT 0,
    "black" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EndChipCounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Denominations_tableId_key" ON "Denominations"("tableId");

-- CreateIndex
CREATE UNIQUE INDEX "EndChipCounts_tableId_key" ON "EndChipCounts"("tableId");

-- AddForeignKey
ALTER TABLE "Denominations" ADD CONSTRAINT "Denominations_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyIn" ADD CONSTRAINT "BuyIn_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyIn" ADD CONSTRAINT "BuyIn_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EndChipCounts" ADD CONSTRAINT "EndChipCounts_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
