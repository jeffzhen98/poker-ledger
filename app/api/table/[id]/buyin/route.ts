import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { z } from "zod";

const Body = z.object({ 
  playerId: z.string().cuid(), 
  amount: z.number().int() // Allow negative amounts
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { playerId, amount } = Body.parse(await req.json());
    
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
    
    const entry = await prisma.buyIn.create({ 
      data: { tableId, playerId, amount } 
    });
    
    return NextResponse.json(entry);
  } catch (error) {
    console.error("Buy-in error:", error);
    return NextResponse.json(
      { error: "Failed to add buy-in", details: String(error) },
      { status: 500 }
    );
  }
}

// Add DELETE endpoint to remove specific buy-ins
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { searchParams } = new URL(req.url);
    const buyInId = searchParams.get('buyInId');
    
    if (!buyInId) {
      return NextResponse.json({ error: "buyInId required" }, { status: 400 });
    }
    
    await prisma.buyIn.delete({
      where: { id: buyInId }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete buy-in error:", error);
    return NextResponse.json(
      { error: "Failed to delete buy-in", details: String(error) },
      { status: 500 }
    );
  }
}