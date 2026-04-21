
import { Role, User } from "@/app/types";

interface UserDashboardProps {
    currentUser: User,
    teamMembers: User[]
}

const UserDashboard = ({ currentUser, teamMembers }: UserDashboardProps) => {

    return (
        <>
            <div className="px-6 space-y-2">
                <div>
                    <h2 className="text-2xl font-bold">User Dashboard</h2>
                    <p >Welcome, {currentUser.name}</p>
                </div>
                <div >

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
                                            My Team ({teamMembers.length})
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {
                                        teamMembers.map((member) => (
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

export default UserDashboard;