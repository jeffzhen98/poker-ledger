import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Check if id is a join code or database ID
    const isJoinCode = /^[A-Z]{4}$/.test(id);
    
    const table = await prisma.table.findUnique({
      where: isJoinCode ? { joinCode: id } : { id },
      include: {
        denominations: true,
        players: {
          include: {
            buyIns: true,
            chipCounts: {
              orderBy: { createdAt: "desc" },
              take: 1, // only latest chip count
            },
          },
        },
        buyIns: true,
      },
    });

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    if (!table.denominations) {
      return NextResponse.json({ error: "Denominations not set" }, { status: 400 });
    }

    const denom = table.denominations;

    // total buy-ins in cents
    const totalBuyInCents = table.buyIns.reduce((sum: any, b: { amount: any; }) => sum + b.amount, 0);
    const totalBuyInDollars = totalBuyInCents / 100;

    // compute player stacks
    const playerStacks: {
      playerId: string;
      playerName: string;
      chipValue: number;
      white: number;
      blue: number;
      red: number;
      green: number;
      black: number;
    }[] = [];

    let totalChipValue = 0;

    for (const player of table.players) {
      const latest = player.chipCounts[0];
      if (!latest) continue;

      const chipValue =
        latest.white * denom.white +
        latest.blue * denom.blue +
        latest.red * denom.red +
        latest.green * denom.green +
        latest.black * denom.black;

      totalChipValue += chipValue;

      playerStacks.push({
        playerId: player.id,
        playerName: player.name,
        chipValue,
        white: latest.white,
        blue: latest.blue,
        red: latest.red,
        green: latest.green,
        black: latest.black,
      });
    }

    const delta = totalChipValue - totalBuyInDollars;

    return NextResponse.json({
      message: "Reconciliation complete",
      buyInDollars: totalBuyInDollars,
      chipTotalDollars: totalChipValue,
      delta,
      playerStacks,
    });
  } catch (error) {
    console.error("Reconcile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
