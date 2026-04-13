import { generateToken, hashPassword } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { Role } from "@/app/types";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const { name, email, password, teamCode } = await request.json();
        if (!name || !email || !password) {
            return NextResponse.json({ error: "name, email and password are required!" }, { status: 400 });
        }
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: "User already exists" }, { status: 409 });
        }
        let teamId: string | undefined;
        if (teamCode) {
            const team = await prisma.team.findUnique({ where: { code: teamCode } });
            if (!team) {
                return NextResponse.json({ error: "Invalid team code" }, { status: 400 });
            }
            teamId = team.id;
        }

        const hashedPassword = await hashPassword(password);
        //First User Become Admin
        const isFirstUser = await prisma.user.count() === 0;
        const role = isFirstUser ? Role.ADMIN : Role.USER;

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                teamId,
                role,
            },
            include: {
                team: true,
            },
        });
        const token = generateToken(user.id);
        const response = NextResponse.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                teamId: user.teamId,
                team: user.team,
                role: user.role,
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
        console.error(`Registration Failed:${error}`);
        return NextResponse.json({ error: "Internal Server Error, Someting went wrong!" }, { status: 500 });
    }
}