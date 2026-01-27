import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { z } from "zod";

const Body = z.object({ 
  name: z.string().min(1),
  userId: z.string().optional()
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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
    
    const player = await prisma.player.create({ 
      data: { 
        name: body.name, 
        tableId,
        userId: body.userId || null
      } 
    });
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