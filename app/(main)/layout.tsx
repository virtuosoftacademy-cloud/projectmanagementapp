
import Header from "@/components/Header"
import { apiClient } from "../lib/apiclient";

const MainLayout = async ({ children }: { children: React.ReactNode }) => {
    const user = await apiClient.GetCurrentUser();
    return (
        <>
            <Header user={user ?? null} />
            {children}
        </>
    )
}
export default MainLayout;