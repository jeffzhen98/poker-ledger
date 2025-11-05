/*
  Warnings:

  - A unique constraint covering the columns `[playerId,tableId]` on the table `PlayerChipCount` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tableId` to the `PlayerChipCount` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Denominations" ALTER COLUMN "white" SET DEFAULT 0.25,
ALTER COLUMN "white" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "blue" SET DEFAULT 0.5,
ALTER COLUMN "blue" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "red" SET DEFAULT 1,
ALTER COLUMN "red" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "green" SET DEFAULT 2,
ALTER COLUMN "green" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "black" SET DEFAULT 5,
ALTER COLUMN "black" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "PlayerChipCount" ADD COLUMN     "tableId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "PlayerChipCount_playerId_tableId_key" ON "PlayerChipCount"("playerId", "tableId");

-- AddForeignKey
ALTER TABLE "PlayerChipCount" ADD CONSTRAINT "PlayerChipCount_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
