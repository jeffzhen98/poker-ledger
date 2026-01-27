import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { z } from "zod";

const Body = z.object({
  white: z.number().min(0.01),
  blue: z.number().min(0.01),
  red: z.number().min(0.01),
  green: z.number().min(0.01),
  black: z.number().min(0.01),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = Body.parse(await req.json());
  
  // Check if id is a join code or database ID
  const isJoinCode = /^[A-Z]{4}$/.test(id);
  
  // Get the actual table ID if using join code
  let tableId = id;
  if (isJoinCode) {
    const table = await prisma.table.findUnique({
      where: { joinCode: id },
      select: { id: true }
    });
    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }
    tableId = table.id;
  }
  
  const updated = await prisma.denominations.upsert({
    where: { tableId },
    update: body,
    create: { tableId, ...body },
  });
  return NextResponse.json(updated);
}