

import { redirect } from "next/navigation";
import Login from "../auth/login/page";
import { getCurrentUser } from "../lib/auth";



const MainPage = async() => {
  const isAuthenticated = await getCurrentUser(); // Replace with your actual authentication logic

  if (!isAuthenticated) {
    redirect ("/auth/login");    
  }
  else {
    redirect("/dashboard");
  }
}
export default MainPage;