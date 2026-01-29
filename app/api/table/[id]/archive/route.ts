import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createServerClient } from "@supabase/ssr";

function createSupabaseClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const response = NextResponse.next();
  const supabase = createSupabaseClient(req, response);

  let user = null;
  
  // First try to get user from cookies/session
  const { data: { user: sessionUser } } = await supabase.auth.getUser();
  user = sessionUser;

  // If no user found via session, try Authorization header
  if (!user) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
    }
  }
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: tableId } = await params;

  // Check if tableId is a join code or database ID
  const isJoinCode = /^[A-Z]{4}$/.test(tableId);

  // Get table with all related data
  const table = await prisma.table.findUnique({
    where: isJoinCode ? { joinCode: tableId } : { id: tableId },
    include: {
      players: {
        include: {
          buyIns: true,
          chipCounts: true,
          user: true,
        },
      },
      denominations: true,
    },
  });

  if (!table) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  // Only host can archive the table
  if (table.hostId !== user.id) {
    return NextResponse.json({ error: "Only the host can archive this table" }, { status: 403 });
  }

  try {
    // Get all users to match player names to userIds
    const allUsers = await prisma.user.findMany({
      select: { id: true, displayName: true, email: true }
    });

    // Create game history
    const gameHistory = await prisma.gameHistory.create({
    data: {
      tableName: table.name,
      joinCode: table.joinCode,
      hostId: table.hostId,
      createdAt: table.createdAt,
      endedAt: new Date(),
      playerResults: {
        create: table.players.map((player) => {
          // Calculate total buy-ins
          const buyInTotal = player.buyIns.reduce((sum, buyIn) => sum + buyIn.amount, 0);

          // Get final chip counts
          const finalChipCount = player.chipCounts[player.chipCounts.length - 1] || {
            white: 0,
            blue: 0,
            red: 0,
            green: 0,
            black: 0,
          };

          // Calculate cash out amount based on denominations
          const denoms = table.denominations || {
            white: 0.25,
            blue: 0.5,
            red: 1,
            green: 2,
            black: 5,
          };

          const cashOutAmount = Math.round(
            (finalChipCount.white * denoms.white +
              finalChipCount.blue * denoms.blue +
              finalChipCount.red * denoms.red +
              finalChipCount.green * denoms.green +
              finalChipCount.black * denoms.black) *
              100
          ); // Convert to cents

          // Try to match player to a user account by display name if userId is not set
          let userId = player.userId;
          if (!userId && player.name) {
            const matchedUser = allUsers.find(u => 
              u.displayName?.toLowerCase() === player.name.toLowerCase() ||
              u.email?.split('@')[0].toLowerCase() === player.name.toLowerCase()
            );
            userId = matchedUser?.id || null;
          }

          return {
            userId,
            playerName: player.name,
            buyInTotal,
            chipCountWhite: finalChipCount.white,
            chipCountBlue: finalChipCount.blue,
            chipCountRed: finalChipCount.red,
            chipCountGreen: finalChipCount.green,
            chipCountBlack: finalChipCount.black,
            cashOutAmount,
            profitLoss: cashOutAmount - buyInTotal,
          };
        }),
      },
    },
  });

    // Delete all related records first, then the table
    // Delete in the correct order to avoid foreign key violations
    
    // 1. Delete player chip counts
    await prisma.playerChipCount.deleteMany({
      where: { tableId: table.id }
    });
    
    // 2. Delete buy-ins
    await prisma.buyIn.deleteMany({
      where: { tableId: table.id }
    });
    
    // 3. Delete players
    await prisma.player.deleteMany({
      where: { tableId: table.id }
    });
    
    // 4. Delete denominations
    if (table.denominations) {
      await prisma.denominations.delete({
        where: { tableId: table.id }
      });
    }
    
    // 5. Delete end chip counts
    await prisma.endChipCounts.deleteMany({
      where: { tableId: table.id }
    });
    
    // 6. Finally delete the table
    await prisma.table.delete({
      where: { id: table.id }
    });

  return NextResponse.json({ 
    message: "Table archived successfully",
    gameHistoryId: gameHistory.id 
  });
  } catch (error) {
    console.error("Archive game error:", error);
    return NextResponse.json(
      { error: "Failed to archive game", details: String(error) },
      { status: 500 }
    );
  }
}
