import { NextResponse } from "next/server";


export async function POST() {
    try{
        const response = NextResponse.json({ message: "Logged out successfully" },{ status: 200 });
        response.cookies.set("token", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 0, // Expire immediately
        });
        return response;
    }catch (error) {
        return NextResponse.json({ error: "An error occurred while logging out" }, { status: 500 });
    }
}