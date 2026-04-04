import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/students
 *
 * Create or upsert a student profile from extracted conversation data.
 * The agent calls this after extracting data points during a session.
 *
 * Body: Partial<StudentProfile>
 */
export async function POST(request: Request) {
	try {
		const body = await request.json();

		if (!body.name && !body.email && !body.phone) {
			return NextResponse.json(
				{
					error:
						"At least one identifier (name, email, or phone) is required",
				},
				{ status: 400 },
			);
		}

		const { data, error } = await supabase
			.from("student_profiles")
			.insert(body)
			.select("*")
			.single();

		if (error) {
			console.error("Failed to create student profile:", error);
			return NextResponse.json(
				{ error: "Failed to create student profile" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ profile: data });
	} catch (error) {
		console.error("Student profile creation error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * GET /api/students
 *
 * List student profiles for the counsellor/admin dashboard.
 * Query params: limit, offset, search (searches name/email)
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const limit = Number.parseInt(searchParams.get("limit") || "20", 10);
		const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
		const search = searchParams.get("search");

		let query = supabase
			.from("student_profiles")
			.select("*", { count: "exact" })
			.order("created_at", { ascending: false })
			.range(offset, offset + limit - 1);

		if (search) {
			query = query.or(
				`name.ilike.%${search}%,email.ilike.%${search}%`,
			);
		}

		const { data, count, error } = await query;

		if (error) {
			console.error("Failed to list students:", error);
			return NextResponse.json(
				{ error: "Failed to list students" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ profiles: data, total: count });
	} catch (error) {
		console.error("Students list error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
