import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";

export async function GET() {
	try {
		// Check if admin user already exists
		const existingUser = await db.user.findUnique({
			where: { username: "admin@example.com" },
		});

		if (existingUser) {
			return NextResponse.json(
				{ message: "Admin user already exists" },
				{ status: 200 }
			);
		}

		// Create admin user
		const hashedPassword = await hash("Admin@123", 10);

		const user = await db.user.create({
			data: {
				username: "admin@example.com",
				password_hash: hashedPassword,
				role: "admin",
				is_active: true,
			},
		});

		return NextResponse.json(
			{
				message: "Admin user created successfully",
				user: {
					id: user.id,
					username: user.username,
					role: user.role,
				},
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("Error creating admin user:", error);
		return NextResponse.json(
			{ error: "Failed to create admin user" },
			{ status: 500 }
		);
	}
}
