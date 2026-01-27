/*
  Warnings:

  - A unique constraint covering the columns `[joinCode]` on the table `Table` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `hostId` to the `Table` table without a default value. This is not possible if the table is not empty.
  - Added the required column `joinCode` to the `Table` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Player" DROP CONSTRAINT "Player_userId_fkey";

-- AlterTable
ALTER TABLE "Player" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Table" ADD COLUMN     "hostId" TEXT NOT NULL,
ADD COLUMN     "joinCode" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "displayName" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "GameHistory" (
    "id" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "joinCode" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerGameResult" (
    "id" TEXT NOT NULL,
    "gameHistoryId" TEXT NOT NULL,
    "userId" TEXT,
    "playerName" TEXT NOT NULL,
    "buyInTotal" INTEGER NOT NULL,
    "chipCountWhite" INTEGER NOT NULL DEFAULT 0,
    "chipCountBlue" INTEGER NOT NULL DEFAULT 0,
    "chipCountRed" INTEGER NOT NULL DEFAULT 0,
    "chipCountGreen" INTEGER NOT NULL DEFAULT 0,
    "chipCountBlack" INTEGER NOT NULL DEFAULT 0,
    "cashOutAmount" INTEGER NOT NULL,
    "profitLoss" INTEGER NOT NULL,

    CONSTRAINT "PlayerGameResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Table_joinCode_key" ON "Table"("joinCode");

-- AddForeignKey
ALTER TABLE "Table" ADD CONSTRAINT "Table_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerGameResult" ADD CONSTRAINT "PlayerGameResult_gameHistoryId_fkey" FOREIGN KEY ("gameHistoryId") REFERENCES "GameHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
