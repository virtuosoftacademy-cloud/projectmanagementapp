"use server"

import { getCurrentUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error("Unauthorized");
    }

    const name = formData.get("name") as string;
    const hourlyRate = formData.get("hourlyRate") ? parseInt(formData.get("hourlyRate") as string) : null;
    const monthlyHours = formData.get("monthlyHours") ? parseInt(formData.get("monthlyHours") as string) : null;

    if (!name) {
      throw new Error("Name is required");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        hourlyRate,
        monthlyHours,
      },
    });

    revalidatePath("/dashboard/profile");
    
    return { success: true, message: "Profile updated successfully!" };
  } catch (error) {
    console.error("Failed to update profile:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to update profile. Please try again." 
    };
  }
}
