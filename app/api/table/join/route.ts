import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const Body = z.object({ 
  joinCode: z.string().length(4).toUpperCase() 
});

export async function POST(req: NextRequest) {
  const { joinCode } = Body.parse(await req.json());
  
  const table = await prisma.table.findUnique({
    where: { joinCode },
    include: {
      host: {
        select: {
          displayName: true,
          email: true,
        },
      },
      players: {
        select: {
          id: true,
          name: true,
          userId: true,
        },
      },
      denominations: true,
    },
  });

  if (!table) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  if (table.endedAt) {
    return NextResponse.json({ error: "This table has ended" }, { status: 410 });
  }

  return NextResponse.json(table);
}
