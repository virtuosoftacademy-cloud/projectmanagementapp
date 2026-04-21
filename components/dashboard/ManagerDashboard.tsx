'use client'

import { Role, User } from "@/app/types";

interface ManagerDashboardProps {
    TeamMembers: User[],
    AllTeamMembers: User[],
    currentUser: User,
}

const ManagerDashboard = ({
    TeamMembers,
    AllTeamMembers,
    currentUser
}: ManagerDashboardProps) => {

    return (
        <>
            <div className="px-6 space-y-2">
                <div>
                    <h2 className="text-2xl font-bold">Manager Dashboard</h2>
                    <p >User & Team Management</p>
                </div>
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ">
                    <div className="border border-slate-700 rounded-lg p-6 text-center">
                        <div className="text-2xl font-bold text-gray-700">
                            {TeamMembers.filter(user => user.role === Role.MANAGER).length}
                        </div>
                        Managers
                    </div>
                    <div className="border border-slate-700 rounded-lg p-6 text-center">
                        <div className="text-2xl font-bold text-gray-700">
                            {TeamMembers.length}
                        </div>
                        Team Members
                    </div>

                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    {/*All Team Members*/}
                    <div className="border-2 border-slate-700 rounded-lg">
                        {/* <div className="p-4 border-b border-slate-700">
                            <h3 className="font-semibold">Users ({users.length})</h3>
                            <p className="text-sm">Manages Roles & Team Assignment</p>
                        </div> */}
                        <div className="p-4">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left py-2 text-slate-800 border-b border-slate-700">
                                        <th className="text-left py-2">
                                            Team Members ({AllTeamMembers.length})
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {
                                        AllTeamMembers.map((user) => (
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
                                                                {user.email} . {user.role} . {user.team?.code}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {/*All Team Members*/}
                    <div className="border-2 border-slate-700 rounded-lg">
                        {/* <div className="p-4 border-b border-slate-700">
                            <h3 className="font-semibold">Users ({users.length})</h3>
                            <p className="text-sm">Manages Roles & Team Assignment</p>
                        </div> */}
                        <div className="p-4">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left py-2 text-slate-800 border-b border-slate-700">
                                        <th className="text-left py-2">
                                            My Team ({TeamMembers.length})
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {
                                        TeamMembers.map((member) => (
                                            <tr key={member.id} className="border-b border-slate-700">
                                                <td className="py-2">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="size-6 bg-green-300 text-green-700 rounded-full flex items-center justify-center">
                                                            {member.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div>
                                                                {member.name}
                                                            </div>
                                                            <div className="text-slate-700 text-xs">
                                                                {member.email} . {member.role} . {member.team?.code}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
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

export default ManagerDashboard;