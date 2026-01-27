import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Check if id is a 4-letter join code (all uppercase letters) or a database ID
  const isJoinCode = /^[A-Z]{4}$/.test(id);
  
  const table = await prisma.table.findUnique({
    where: isJoinCode ? { joinCode: id } : { id },
    include: {
      players: {
        include: {
          buyIns: true,
          chipCounts: true,
        },
      },
      buyIns: true,
      denominations: true,
      endChipCounts: true,
    },
  });
  
  return NextResponse.json(table);
}