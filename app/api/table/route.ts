import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
import { generateJoinCode } from "@/lib/joinCode";

const Body = z.object({ name: z.string().min(1) });

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

export async function POST(req: NextRequest) {
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

  const { name } = Body.parse(await req.json());
  
  // Generate unique join code
  let joinCode = generateJoinCode();
  let attempts = 0;
  const maxAttempts = 10;
  
  // Ensure join code is unique
  while (attempts < maxAttempts) {
    const existing = await prisma.table.findUnique({
      where: { joinCode }
    });
    
    if (!existing) break;
    
    joinCode = generateJoinCode();
    attempts++;
  }
  
  if (attempts === maxAttempts) {
    return NextResponse.json({ error: "Failed to generate unique join code" }, { status: 500 });
  }

  // Get or create user in database
  const dbUser = await prisma.user.upsert({
    where: { email: user.email! },
    update: {},
    create: {
      id: user.id,
      email: user.email!,
      displayName: user.user_metadata?.displayName || user.email!.split('@')[0]
    }
  });

  const table = await prisma.table.create({ 
    data: { 
      name,
      joinCode,
      hostId: user.id,
      players: {
        create: {
          name: dbUser.displayName,
          userId: user.id
        }
      }
    } 
  });
  
  return NextResponse.json(table);
}