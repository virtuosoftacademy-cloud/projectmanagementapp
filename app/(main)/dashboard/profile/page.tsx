import { getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { ProfileContent } from "@/components/profile/ProfileContent";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch stats and lists
  const [projectCount, taskCount, completedTaskCount, projects, tasks] = await Promise.all([
    prisma.project.count({ where: { userId: user.id } }),
    prisma.task.count({ where: { userId: user.id } }),
    prisma.task.count({ where: { userId: user.id, status: "DONE" } }),
    prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.task.findMany({
      where: { userId: user.id },
      include: {
        user: true,
        project: true // Now that relation exists
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const stats = {
    projects: projectCount,
    tasks: taskCount,
    completed: completedTaskCount,
    hoursLogged: user.monthlyHours || 0, // Mocked using monthlyHours as per request
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">View and manage your personal information</p>
      </div>

      <ProfileContent 
        user={user} 
        stats={stats} 
        projects={projects} 
        tasks={tasks} 
      />
    </div>
  );
}
