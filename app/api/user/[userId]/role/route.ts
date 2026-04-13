import { checkUserPermission, getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { Role } from "@/app/types";
import { NextRequest, NextResponse } from "next/server";


export async function PATCH(req: NextRequest,
    context: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await context.params;
        const currentuser = await getCurrentUser();
        if (!currentuser || !checkUserPermission(currentuser, Role.ADMIN)) {
            return NextResponse.json({ error: "You are not authorized" }, { status: 401 });
        }
        // Prevents users from changing their own role
        if (userId === currentuser.id) {
            return NextResponse.json({ error: "You cannot change your role" }, { status: 403 });
        }
        const { role } = await req.json();

        //Validate role
        const validRoles = [Role.ADMIN, Role.MANAGER, Role.USER];
        if (!role || !validRoles.includes(role)) {
            return NextResponse.json({ error: "Invalid role or you cannot have more than one admin role" }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { role },
            include: { team: true }
        });
        return NextResponse.json({ user: updatedUser, message: `User Role Updated to ${role} successfully!` });
    } catch (error) {
        console.error("Role assigned Error:", error);
        if (error instanceof Error && error.message.includes("Record to update not found.")) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}