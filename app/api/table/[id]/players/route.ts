import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { z } from "zod";

const Body = z.object({ name: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name } = Body.parse(await req.json());
  const player = await prisma.player.create({ data: { name, tableId: id } });
  return NextResponse.json(player);
}