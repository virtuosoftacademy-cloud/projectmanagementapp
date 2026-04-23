
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { cookies } from "next/headers";
import { Role, User } from "../types";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET!;

export const hashPassword = async (password: string): Promise<string> => {
    return bcrypt.hash(password, 12)
}

export const verifyPassword = async (password: string, hashPassword: string): Promise<boolean> => {
    return bcrypt.compare(password, hashPassword)
}

export const generateToken = (userId: string): string => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" })
}

export const verifyToken = (token: string): { userId: string } => {
    return jwt.verify(token, JWT_SECRET) as { userId: string }
}

export const getCurrentUser = async (): Promise<User | null> => {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("token")?.value;
        if (!token) return null
        const decode = verifyToken(token);

        const userfromDB = await prisma.user.findUnique({
            where: {
                id: decode.userId,
            }
        });

        if (!userfromDB) return null;
        const { password, ...user } = userfromDB;
        return user as User;
    } catch (error) {
        console.error(`Error in Getting CurrentUser:${error}`);
        return null
    }
}

export const checkUserPermission =(
    user: User,
    requiredRole: Role,
): boolean => {
    const roleHierarchy = {
        [Role.GUEST]: 0,
        [Role.USER]: 1,
        [Role.MANAGER]: 2,
        [Role.ADMIN]: 3,
    }
    return roleHierarchy[user.role] >= roleHierarchy[requiredRole]
}
