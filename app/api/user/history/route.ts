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

export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createSupabaseClient(request, response);

  let user = null;
  
  const { data: { user: sessionUser } } = await supabase.auth.getUser();
  user = sessionUser;

  if (!user) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
    }
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all game results for this user
    const gameResults = await prisma.playerGameResult.findMany({
      where: { userId: user.id },
      include: {
        gameHistory: true,
      },
      orderBy: {
        gameHistory: {
          endedAt: 'desc'
        }
      }
    });

    return NextResponse.json(gameResults);
  } catch (error) {
    console.error("Error fetching game history:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
