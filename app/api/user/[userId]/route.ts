
import { checkUserPermission, getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { Role } from "@/app/types";
import { Prisma } from "@/generated/prisma";
import { NextRequest, NextResponse } from "next/server";


export async function DELETE(req: NextRequest,
    context: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await context.params;
        const currentuser = await getCurrentUser();
        
        if (!currentuser || !checkUserPermission(currentuser, Role.ADMIN)) {
            return NextResponse.json({ error: "You are not authorized" }, { status: 401 });
        }

        if (userId === currentuser.id) {
            return NextResponse.json({ error: "User Cannot be deleted" }, { status: 403 });
        }


        const deleteUser = await prisma.user.delete({
            where: { id: userId }
        });

        return NextResponse.json({ user: deleteUser, message: `User Deleted Successfully!` });

    } catch (error) {
        console.error("Deletion Error:", error);
        if (error instanceof Error && error.message.includes("Record to delete not found.")) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

}