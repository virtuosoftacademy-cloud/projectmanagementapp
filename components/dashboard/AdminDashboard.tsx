'use client'

import { apiClient } from "@/app/lib/apiclient";
import { Role, Team, User } from "@/app/types";
import { useTransition } from "react";

interface AdminDashboardProps {
    users: User[],
    teams: Team[],
    currentUser: User[],
}

const AdminDashboard = ({
    users,
    teams,
    currentUser
}: AdminDashboardProps) => {
    const [isPending, startTransition] = useTransition();
    
    const handleTeamAssignment = async (userId: string, teamId: string) => {
        startTransition(async () => {
            try {
                await apiClient.AssignUserToTeam(userId, teamId);
                               
            } catch (error) {
                alert(
                    error instanceof Error
                        ? error.message
                        : "Error updating team assignment"
                )
            }
        })
    }

    const handleRoleAssignment = async (userId: string, newRole: Role) => {
        if (userId === currentUser.id) {
            alert("You cannot change your own role")
            return;
        }
        startTransition(async () => {
            try {
                await apiClient.UpdateUserRole(userId, newRole);
                router.reload();
            } catch (error) {
                alert(
                    error instanceof Error
                        ? error.message
                        : "Error updating role assignment"
                )
            }
        })
    }

    return <></>
}

export default AdminDashboard;