import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { z } from "zod";

const Body = z.object({
  white: z.number().int().min(0),
  blue: z.number().int().min(0),
  red: z.number().int().min(0),
  green: z.number().int().min(0),
  black: z.number().int().min(0),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = Body.parse(await req.json());
  const counts = await prisma.endChipCounts.upsert({
    where: { tableId: id },
    update: body,
    create: { tableId: id, ...body },
  });
  return NextResponse.json(counts);
}