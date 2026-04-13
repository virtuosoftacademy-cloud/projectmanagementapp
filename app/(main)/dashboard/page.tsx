import AdminDashboard from "@/components/dashboard/AdminDashboard"



const DashboardLayout = () => {
  // const user = await getCurrentUser();
  // if (!user) {
  //   redirect("/auth/login")
  // }

  //Redirect based on user role
  // switch (user.role) {
  //   case Role.ADMIN:
  //     redirect("/dashboard/admin")
  //   case Role.MANAGER:
  //     redirect("/dashboard/manager")
  //   case Role.USER:
  //     redirect("/dashboard/user")
  //   default:
  //     redirect("/dashboard/admin")
  // }

  return (
    <AdminDashboard />
  )
}

export default DashboardLayout