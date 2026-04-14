
import { checkConnection } from "@/app/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    const connection = await checkConnection();
    try {
        if (!connection) {
            return NextResponse.json({status:"error", message:"Connection failed."}, { status: 503 });
        }
        return NextResponse.json({status:"success", message:"Health check passed."}, { status: 200 });
    } catch (error) {
        console.error("Error occurred during health check:", error);
        return NextResponse.json({status:"error", message:"Internal Server Error."}, { status: 500 });
    }
}