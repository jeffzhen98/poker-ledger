import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
  
  // First try to get user from cookies/session
  const { data: { user: sessionUser } } = await supabase.auth.getUser();
  user = sessionUser;

  // If no user found via session, try Authorization header
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
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, displayName: true },
    });

    if (!userProfile) {
      // Create user profile if it doesn't exist
      const newUser = await prisma.user.create({
        data: {
          id: user.id,
          email: user.email!,
          displayName: "",
        },
      });
      return NextResponse.json(newUser);
    }

    return NextResponse.json(userProfile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createSupabaseClient(request, response);

  let user = null;
  
  // First try to get user from cookies/session
  const { data: { user: sessionUser } } = await supabase.auth.getUser();
  user = sessionUser;

  // If no user found via session, try Authorization header
  if (!user) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
    }
  }

  if (!user) {
    console.error("No user found in PUT request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { displayName } = body;

    if (!displayName || typeof displayName !== "string") {
      return NextResponse.json({ error: "Invalid displayName" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { displayName },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json({ error: "Internal server error", details: String(error) }, { status: 500 });
  }
}
