
import { checkUserPermission, getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { Role } from "@/app/types";
import { redirect } from "next/navigation";


const UserPage = async () => {

    const user = await getCurrentUser()
    if (!user) {
        redirect("/auth/login")
    }

    //Fetch Manager's own team members

    const TeamMembers = user.teamId ?
        prisma.user.findMany({
            where: {
                teamId: user.teamId,
            },
            select:{
                id:true,
                name:true,
                email:true,
                role:true
            }
        }) : []

    return (
        <UserDashboard
            TeamMembers={TeamMembers}
            currentUser={user} />
    )
}
export default UserPage;