import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { z } from "zod";

const Body = z.object({
  playerId: z.string().cuid(),
  white: z.number().int().min(0),
  blue: z.number().int().min(0),
  red: z.number().int().min(0),
  green: z.number().int().min(0),
  black: z.number().int().min(0),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { playerId, white, blue, red, green, black } = Body.parse(await req.json());
    
    const chipCount = await prisma.playerChipCount.upsert({
      where: { 
        playerId_tableId: { 
          playerId, 
          tableId: id 
        } 
      },
      update: { white, blue, red, green, black },
      create: { playerId, tableId: id, white, blue, red, green, black },
    });
    
    return NextResponse.json(chipCount);
  } catch (error) {
    console.error("Chip counts error:", error);
    return NextResponse.json(
      { error: "Failed to save chip counts", details: String(error) },
      { status: 500 }
    );
  }
}