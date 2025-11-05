import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const table = await prisma.table.findUnique({
    where: { id },
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