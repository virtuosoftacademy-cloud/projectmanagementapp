// app/actions/login.ts
'use server';

import { cookies } from "next/headers";
import { prisma } from "../prisma";
import { generateToken, verifyPassword } from "../auth";

export type LoginStatus = {
  error?: string | undefined;
  success?: boolean | undefined;
};

export async function loginAction(
  prevState: LoginStatus,
  formData: FormData
): Promise<LoginStatus> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  try {
    const userFromDB = await prisma.user.findUnique({
      where: { email },
      include: { team: true },
    });

    if (!userFromDB) {
      return { error: "Invalid email or password" };
    }

    const isPasswordValid = await verifyPassword(password, userFromDB.password);
    if (!isPasswordValid) {
      return { error: "Invalid email or password" };
    }

  } catch (error) {
    console.error("Login action error:", error);
    return { error: "Something went wrong. Please try again." };
  }
}