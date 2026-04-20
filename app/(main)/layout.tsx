

const MainLayout = async ({ children }: { children: React.ReactNode }) => {
    // const user = await getCurrentUser();
    return (
        <>
            {/* <Header user={user ?? null} /> */}
            {children}
        </>
    )
}
export default MainLayout;