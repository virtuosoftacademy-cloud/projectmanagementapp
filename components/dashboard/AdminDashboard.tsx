'use client'

import { apiClient } from "@/app/lib/apiclient";
import { Role, Team, User } from "@/app/types";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "../ui/button";
import { toast } from "sonner";

interface AdminDashboardProps {
    users: User[],
    teams: Team[],
    currentUser: User,
}

const AdminDashboard = ({
    users,
    teams,
    currentUser
}: AdminDashboardProps) => {
    const [isPending, startTransition] = useTransition();
    const router = useRouter()

    const handleRemoveMember = async (userId: string) => {
        startTransition(async () => {
            try {
                await apiClient.deleteUser(userId);
                router.refresh();
                toast.success(`User Deleted Successfully`)
            } catch (error) {
                alert(
                    error instanceof Error
                        ? error.message
                        : "Error deletion"
                )
            }
        })
    }

    const handleTeamAssignment = async (userId: string, teamId: string | null) => {
        startTransition(async () => {
            try {
                await apiClient.AssignUserToTeam(userId, teamId);
                router.refresh();
                toast.success(`Team Changed`)
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
                router.refresh();
                toast.success(`Role Changed`)
            } catch (error) {
                alert(
                    error instanceof Error
                        ? error.message
                        : "Error updating role assignment"
                )
            }
        })
    }

    return (
        <>
            <div className="px-6 space-y-2">
                <div>
                    <h2 className="text-2xl font-bold">Admin Dashboard</h2>
                    <p >User & Team Management</p>
                </div>
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6">
                    <div className="border border-slate-700 rounded-lg p-6 text-center">
                        <div className="text-2xl font-bold text-gray-700">
                            {users.length}
                        </div>
                        Total Users
                    </div>
                    <div className="border border-slate-700 rounded-lg p-6 text-center">
                        <div className="text-2xl font-bold text-gray-700">
                            {users.filter(user => user.role === Role.ADMIN).length}
                        </div>
                        Admin
                    </div>
                    <div className="border border-slate-700 rounded-lg p-6 text-center">
                        <div className="text-2xl font-bold text-gray-700">
                            {users.filter(user => user.role === Role.MANAGER).length}
                        </div>
                        Managers
                    </div>
                    <div className="border border-slate-700 rounded-lg p-6 text-center">
                        <div className="text-2xl font-bold text-gray-700">
                            {users.filter(user => user.role === Role.USER).length}
                        </div>
                        Users
                    </div>
                    <div className="border border-slate-700 rounded-lg p-6 text-center">
                        <div className="text-2xl font-bold text-gray-700">
                            {teams.length}
                        </div>
                        Teams
                    </div>

                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    {/*Users table with role and team assignment*/}
                    <div className="border-2 border-slate-700 rounded-lg">
                        <div className="p-4 border-b border-slate-700">
                            <h3 className="font-semibold">Users ({users.length})</h3>
                            <p className="text-sm">Manages Roles & Team Assignment</p>
                        </div>
                        <div className="p-4">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left py-2 text-slate-800 border-b border-slate-700">
                                        <th className="text-left py-2">
                                            Name
                                        </th>

                                        <th className="text-left py-2">
                                            Role
                                        </th>

                                        <th className="text-left py-2">
                                            Team
                                        </th>

                                        <th className="text-left py-2">
                                            Actions
                                        </th>

                                    </tr>
                                </thead>
                                <tbody>
                                    {
                                        users.map((user) => (
                                            <tr key={user.id} className="border-b border-slate-700">
                                                <td className="py-2">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="size-6 bg-green-300 text-green-700 rounded-full flex items-center justify-center">
                                                            {user.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div>
                                                                {user.name}
                                                            </div>
                                                            <div className="text-slate-700 text-xs">
                                                                {user.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-2">
                                                    <select
                                                        value={user.role}
                                                        onChange={(e) => {
                                                            handleRoleAssignment(user.id, e.target.value as Role)
                                                        }}
                                                        disabled={isPending || user.id === currentUser.id}>
                                                        <option value={Role.USER}>
                                                            User
                                                        </option>
                                                        <option value={Role.ADMIN}>
                                                            Admin
                                                        </option>
                                                        <option value={Role.MANAGER}>
                                                            Manager
                                                        </option>
                                                    </select>
                                                </td>
                                                <td className="py-2">
                                                    <select
                                                        value={user.teamId || ""}
                                                        onChange={(e) => { handleTeamAssignment(user.id, e.target.value || null) }}
                                                        disabled={isPending}>
                                                        <option value="">No Team</option>
                                                        {teams.map((team) => (
                                                            <option key={team.id} value={team.id}>
                                                                {team.name}
                                                            </option>
                                                        ))
                                                        }
                                                    </select>
                                                    {
                                                        user.team && (
                                                            <span className="text-xs">
                                                                {user.team.code}
                                                            </span>
                                                        )
                                                    }
                                                </td>
                                                <td className="py-2">
                                                    <Button
                                                        onClick={() => handleRemoveMember(user.id)}
                                                        disabled={isPending}
                                                        variant={"destructive"}
                                                    >
                                                        Remove
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {/* Teams Table */}
                    <div className="border-2 border-slate-700 rounded-lg">
                        <div className="p-4 border-b border-slate-700">
                            <h3 className="font-semibold">Teams ({teams.length})</h3>
                            <p className="text-sm">Team Overview</p>
                        </div>
                        <div className="p-4">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left py-2 text-slate-800 border-b border-slate-700">
                                        <th className="text-left py-2">
                                            Name
                                        </th>

                                        <th className="text-left py-2">
                                            Code
                                        </th>

                                        <th className="text-left py-2">
                                            Members
                                        </th>

                                        <th className="text-left py-2">
                                            Managers
                                        </th>

                                    </tr>
                                </thead>
                                <tbody>
                                    {teams.map((team) => {

                                        const teamMembers = users.filter(
                                            user => user.teamId === team.id
                                        );

                                        const teamManagers = teamMembers.filter(
                                            user => user.role === Role.MANAGER
                                        );

                                        return (
                                            <tr
                                                key={team.id}
                                                className="border-b border-slate-700"
                                            >
                                                <td className="py-2 font-medium">
                                                    {team.name}
                                                </td>
                                                <td className="py-2">
                                                        <span key={teamMembers[0].id} className="bg-green-700 text-white p-1 rounded">
                                                            {teamMembers[0].team?.code}
                                                        </span>
                                                        {/* {team?.code} */}
                                                </td>
                                                <td className="py-2 font-medium">
                                                    {teamMembers.length} users
                                                </td>
                                                <td className="py-2">
                                                    <div className="flex flex-wrap gap-1">
                                                        {
                                                            teamManagers.length > 0 ? (
                                                                teamManagers.map((manager) => (
                                                                    <Button variant={"outline"} key={manager.id}>
                                                                        {manager.name}
                                                                    </Button>
                                                                ))
                                                            ) : (
                                                                <div>No Manager</div>
                                                            )
                                                        }
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </>
    )
}

export default AdminDashboard;