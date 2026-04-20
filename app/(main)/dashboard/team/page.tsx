
import { getCurrentUser } from "@/app/lib/auth";
import { Role } from "@/app/types";
import { redirect } from "next/navigation";

const TeamLayout = async() => {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login")
  }

  // Redirect based on user role
  switch (user.role) {
    case Role.ADMIN:
      redirect("/dashboard/team/admin")
    case Role.MANAGER:
      redirect("/dashboard/team/manager")
    case Role.USER:
      redirect("/dashboard/team/user")
    default:
      redirect("/dashboard/team/user")
  }

}

export default TeamLayout