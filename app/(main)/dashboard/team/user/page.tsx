
import { checkUserPermission, getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { Role } from "@/app/types";
import UserDashboard from "@/components/dashboard/UserDashboard";
import { redirect } from "next/navigation";
import { User } from "@/app/types";


const UserPage = async () => {

    const user = await getCurrentUser()
    if (!user) {
        redirect("/auth/login")
    }

    //Fetch User's own team members

    const TeamMembers: User[] = user.teamId ?
        await prisma.user.findMany({
            where: {
                teamId: user.teamId,
                role: { not: Role.ADMIN }
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
            }
        }) as User[] : []

    return (
        <UserDashboard
            teamMembers={TeamMembers}
            currentUser={user} />
    )
}
export default UserPage;