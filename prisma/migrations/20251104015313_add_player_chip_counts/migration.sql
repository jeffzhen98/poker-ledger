-- CreateTable
CREATE TABLE "PlayerChipCount" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "white" INTEGER NOT NULL DEFAULT 0,
    "blue" INTEGER NOT NULL DEFAULT 0,
    "red" INTEGER NOT NULL DEFAULT 0,
    "green" INTEGER NOT NULL DEFAULT 0,
    "black" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerChipCount_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PlayerChipCount" ADD CONSTRAINT "PlayerChipCount_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
