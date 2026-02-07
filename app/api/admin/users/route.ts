import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { getAllUsers, createUser, checkITSExists } from "@/lib/users";
import type { UserListFilters } from "@/lib/interfaces/user";

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  its: z.number().int().positive("ITS must be a positive number"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  phoneOrEmail: z.string().optional(),
  role: z.enum(["admin", "cook", "volunteer"]),
});

export async function GET(request: Request) {
  try {
    // Verify authentication and admin role
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifySessionToken(token.value);
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse query parameters for filters
    const { searchParams } = new URL(request.url);
    const filters: UserListFilters = {};

    const role = searchParams.get("role");
    if (role && ["admin", "cook", "volunteer"].includes(role)) {
      filters.role = role as any;
    }

    const isActive = searchParams.get("isActive");
    if (isActive !== null) {
      filters.isActive = isActive === "true";
    }

    const sortBy = searchParams.get("sortBy");
    if (sortBy && ["name", "its", "createdAt"].includes(sortBy)) {
      filters.sortBy = sortBy as any;
    }

    const sortOrder = searchParams.get("sortOrder");
    if (sortOrder && ["asc", "desc"].includes(sortOrder)) {
      filters.sortOrder = sortOrder as any;
    }

    const users = await getAllUsers(filters);

    // Remove password hashes from response
    const sanitizedUsers = users.map((u) => ({
      _id: u._id!.toString(),
      name: u.name,
      its: u.its,
      phoneOrEmail: u.phoneOrEmail,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    return NextResponse.json({ users: sanitizedUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Verify authentication and admin role
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifySessionToken(token.value);
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json().catch(() => null);
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Check if ITS already exists
    const itsExists = await checkITSExists(parsed.data.its);
    if (itsExists) {
      return NextResponse.json(
        { error: "ITS number already exists" },
        { status: 409 }
      );
    }

    // Create user
    const newUser = await createUser(parsed.data);

    return NextResponse.json(
      {
        user: {
          _id: newUser._id!.toString(),
          name: newUser.name,
          its: newUser.its,
          phoneOrEmail: newUser.phoneOrEmail,
          role: newUser.role,
          isActive: newUser.isActive,
          createdAt: newUser.createdAt,
        },
        message: "User created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
