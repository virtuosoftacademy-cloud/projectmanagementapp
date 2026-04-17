import { getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { Role } from "@/app/types";
import { Prisma } from "@/generated/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "You are not authenticated" }, { status: 401 });
        }
        const searchParams = req.nextUrl.searchParams;
        const teamId = searchParams.get("teamId");
        const role = searchParams.get("role");
        //Build where clause based on role
        let where: Prisma.UserWhereInput = {};
        if (user.role === Role.ADMIN) {
            // Admin can see all users
        } else if (user.role === Role.MANAGER) {
            // Manager can see users in their team
            where.OR = [{ teamId: user.teamId }, { role: Role.USER }];
        } else {
            // Regular users can only see other regular users in their team
            where.teamId = user.teamId; // They can see users in their team
            where.role = { not: Role.ADMIN }; // They cannot see admins
        }
        // Apply additional filters if provided
        if (teamId) {
            where.teamId = teamId;
        }
        if (role) {
            where.role = role as Role;
        }
        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                teamId: true,
                team: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                createdAt: true,
            },
            orderBy: {createdAt: "desc"}
        });
        return NextResponse.json({users});
    } catch (error) {
        console.error(`Error In Getting Users : ${error}`);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

    
