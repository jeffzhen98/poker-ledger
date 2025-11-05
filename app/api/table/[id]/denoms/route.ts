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
  const updated = await prisma.denominations.upsert({
    where: { tableId: id },
    update: body,
    create: { tableId: id, ...body },
  });
  return NextResponse.json(updated);
}