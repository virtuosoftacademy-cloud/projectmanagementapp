
'use client'
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  const user = false;
  return (
    <>
      <div className="max-w-4xl m-auto">
        <h1 className="text-3xl font-bold mb-4">Team Access Control Demo</h1>
        <p>
          This is a demo application showcasing team access control using Next.js, NextAuth, and Prisma. It allows users to create teams, invite members, and manage access to resources based on team membership.
        </p>
        <div className="grid grid-cols-2 gap-6 my-8">
          <div className="p-4 border rounded">
            <h2 className="text-xl font-semibold mb-2">Features</h2>
            <ul className="list-disc list-inside">
              <li>User authentication with NextAuth</li>
              <li>Team creation and management</li>
              <li>Inviting members to teams</li>
              <li>Role-based access control</li>
            </ul>
          </div>  
          <div className="p-4 border rounded">
            <h2 className="text-xl font-semibold mb-2">User Roles</h2>
            <ul className="list-disc list-inside">
              <li><strong>Super Admin </strong>: Full System Access</li>
              <li><strong>Admin</strong>: User and Team Management</li>
              <li><strong>Manager </strong>: Team Management</li>
              <li><strong>User </strong>: Limited Access</li>
            </ul>
          </div>
        </div>
        {user ? (
          <div className="p-4 border rounded mt-4 space-y-2">
            <h2>You Are Logged In</h2>
            <h2 className="flex gap-4">
              <span><strong>UserName</strong></span>
              <span><strong>Role</strong></span>
            </h2>
            <div className="flex gap-2 mt-2">
              <Link href={"/dashboard"}>
                <Button>
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-4 border rounded mt-4">
            <h2>You Are Not Logged In</h2>
            <p>Please log in to access the team management features.</p>
            <div className="flex gap-2 mt-2">
              <Link href={"/auth/login"}>
                <Button>
                  Log In
                </Button>
              </Link>
              <Link href={"/auth/register"}>
                <Button>
                  Register
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
