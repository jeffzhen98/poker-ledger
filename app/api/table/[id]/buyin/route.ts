import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { z } from "zod";

const Body = z.object({ 
  playerId: z.string().cuid(), 
  amount: z.number().int().min(1) 
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { playerId, amount } = Body.parse(await req.json());
  const entry = await prisma.buyIn.create({ 
    data: { tableId: id, playerId, amount } 
  });
  return NextResponse.json(entry);
}