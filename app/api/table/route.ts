import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { z } from "zod";

const Body = z.object({ name: z.string().min(1) });

export async function POST(req: NextRequest) {
  const { name } = Body.parse(await req.json());
  const table = await prisma.table.create({ data: { name } });
  return NextResponse.json(table);
}