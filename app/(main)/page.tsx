

import { redirect } from "next/navigation";
import Login from "../auth/login/page";
import { getCurrentUser } from "../lib/auth";



const MainPage = async() => {
  const isAuthenticated = await getCurrentUser(); // Replace with your actual authentication logic

  if (!isAuthenticated) {
    redirect ("/dashboard");    
  }
  return (
    <>
      <Login />
    </>

  )
}
export default MainPage;