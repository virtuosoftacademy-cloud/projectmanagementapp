
import { checkUserPermission, getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { Role } from "@/app/types";
import { redirect } from "next/navigation";


const ManagerPage = async () => {

    const user = await getCurrentUser()
    if (!user || !checkUserPermission(user, Role.ADMIN)) {
        redirect("/unauthorized")
    }

    //Fetch Manager's own team members

    const TeamMembers = user.teamId ?
        prisma.user.findMany({
            where: {
                teamId: user.teamId,
                role: { not: Role.ADMIN }
            },
            include: {
                team: true
            }
        }) : []


    //Fetch Manager's own team members
    const AllTeamMembers = user.teamId ?
        prisma.user.findMany({
            where: {
                role: { not: Role.ADMIN }
            },
            include: {
                team: {
                    select:{
                        id:true,
                        name:true,
                        code:true,
                        description:true
                    },
                },
            },
            orderBy:{
                teamId:"desc"
            }
        }) : []

    return (
        <ManagerDashboard
            TeamMembers={TeamMembers}
            AllTeamMemebers={AllTeamMembers}
            currentUser={user} />
    )
}
export default ManagerPage;