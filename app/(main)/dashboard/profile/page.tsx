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
    prisma.task.count({ where: { userId: user.id, status: "COMPLETED" } }),
    prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.task.findMany({
      where: { userId: user.id },
      include: {
        user: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Transform tasks to include project info if available
  // Note: Schema currently doesn't have a direct link from Task to Project in prisma/schema.prisma
  // I'll check if I can add that or just show them as a list.
  // Actually, looking at schema.prisma, Task only has userId, title, description, status.
  // Project only has name, description, userId, status.
  // There is NO relation between Project and Task in the current schema.
  // I will just display them as separate lists as per the schema.

  const stats = {
    projects: projectCount,
    tasks: taskCount,
    completed: completedTaskCount,
    hoursLogged: user.monthlyHours || 0, // Mocked using monthlyHours as per request
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1">View and manage your personal information</p>
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