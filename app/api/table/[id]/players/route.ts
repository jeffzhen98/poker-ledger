import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { z } from "zod";

const Body = z.object({ name: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name } = Body.parse(await req.json());
    const player = await prisma.player.create({ data: { name, tableId: id } });
    return NextResponse.json(player);
  } catch (error) {
    console.error("Add player error:", error);
    return NextResponse.json(
      { error: "Failed to add player", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get('playerId');
    
    if (!playerId) {
      return NextResponse.json({ error: "playerId required" }, { status: 400 });
    }
    
    // Delete player (cascades to buy-ins and chip counts)
    await prisma.player.delete({
      where: { id: playerId }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete player error:", error);
    return NextResponse.json(
      { error: "Failed to delete player", details: String(error) },
      { status: 500 }
    );
  }
}