/*
  Warnings:

  - Added the required column `userId` to the `Player` table without a default value. This is not possible if the table is not empty.

*/
-- Delete old data first
DELETE FROM "PlayerChipCount";
DELETE FROM "BuyIn";
DELETE FROM "EndChipCounts";
DELETE FROM "Denominations";
DELETE FROM "Player";
DELETE FROM "Table";

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
