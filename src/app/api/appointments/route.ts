import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
	try {
		const { data, error } = await supabase
			.from("appointments")
			.select(`
				id,
				student_name,
				student_email,
				scheduled_at,
				status,
				cal_event_id,
				counsellor:users!counsellor_id(full_name)
			`)
			.order("scheduled_at", { ascending: true });

		if (error) {
			console.error("[API APPOINTMENTS] Fetch error:", error);
			return NextResponse.json(
				{ error: "Failed to fetch appointments" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ appointments: data });
	} catch (error) {
		console.error("[API APPOINTMENTS] Internal server error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
