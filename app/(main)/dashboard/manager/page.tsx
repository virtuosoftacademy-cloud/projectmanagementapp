
import { checkUserPermission, getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { transformTeams, transformUsers } from "@/app/lib/utils";
import { Role, User } from "@/app/types";
import ManagerDashboard from "@/components/dashboard/ManagerDashboard";
import { redirect } from "next/navigation";


const ManagerPage = async () => {

    const user = await getCurrentUser()
    if (!user || !checkUserPermission(user, Role.MANAGER)) {
        redirect("/unauthorized")
    }

    //Fetch Manager's own team members

    const prismaTeamMembers = user.teamId ?
        await prisma.user.findMany({
            where: {
                teamId: user.teamId,
                role: { not: Role.ADMIN }
            },
            include: {
                team: true
            }
        }) : [];

    //Fetch Manager's own team members
    const prismaAllTeamMembers = await prisma.user.findMany({
            where: {
                role: { not: Role.ADMIN }
            },
            include: {
                team: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        description: true
                    },
                },
            },
            orderBy: {
                teamId: "desc"
            }
        });

    const teamMembers = transformUsers(prismaTeamMembers)
    const allteamMembers = transformUsers(prismaAllTeamMembers)

    return (
        <ManagerDashboard
            TeamMembers={teamMembers as User[]}
            AllTeamMembers={allteamMembers as User[]}
            currentUser={user}
        />
    )
}
export default ManagerPage;