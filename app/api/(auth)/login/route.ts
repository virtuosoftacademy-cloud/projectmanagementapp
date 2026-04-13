import { generateToken, verifyPassword } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();
        if (!email || !password) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        const userFromDB = await prisma.user.findUnique({ where: { email }, include: { team: true } });
        if (!userFromDB) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }
        const isPasswordValid = await verifyPassword(password, userFromDB.password);
        if (!isPasswordValid) {
            return NextResponse.json({ error: "Invalid Credentials" }, { status: 402 });
        }
        const token = generateToken(userFromDB.id);
        const response = NextResponse.json({
            user: {
                id: userFromDB.id,
                name: userFromDB.name,
                email: userFromDB.email,
                teamId: userFromDB.teamId,
                team: userFromDB.team,
                role: userFromDB.role,
                token,
            }
        })
        //set cookie
        response.cookies.set("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60, // 7 days
        });
        return response;
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json({ error: "Internal Server Error, Someting went wrong!"}, { status: 500 });
 }
}