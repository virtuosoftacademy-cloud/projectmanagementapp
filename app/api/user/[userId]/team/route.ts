import { checkUserPermission, getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { Role } from "@/app/types";
import { NextRequest, NextResponse } from "next/server";


export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await context.params;
        const user = await getCurrentUser();
        if (!user || !checkUserPermission(user, Role.ADMIN)) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            )
        }
        // Update the user's team
        const { teamId } = await req.json();

        if (teamId) {
            const team = prisma.team.findUnique({
                where: { id: teamId },
            })
            if (!team) {
                return NextResponse.json(
                    { error: "Team not found" },
                    { status: 404 });
            }
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: { teamId },
                include: { team: true }
            });
            return NextResponse.json({
                user: updatedUser, message: teamId ?
                    "User assigned to team successfully!" :
                    "User removed from team successfully!"
            },
                { status: 200 });
        }

    } catch (error) {
        console.error("Error updating team:", error);
        if (error instanceof Error && error.message.includes
            ("Record to update not found.")) { return NextResponse.json({ error: "User not found" }, { status: 404 }); }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}