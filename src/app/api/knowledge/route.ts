import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/knowledge
 *
 * List all stored knowledge documents with metadata.
 */
export async function GET() {
	try {
		const { data, error } = await supabase
			.from("knowledge_docs")
			.select("id, title, category, chunk_count, created_at")
			.order("created_at", { ascending: false });

		if (error) {
			console.error("Failed to fetch documents:", error);
			return NextResponse.json(
				{ error: "Failed to fetch knowledge documents" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ documents: data });
	} catch (error) {
		console.error("Knowledge list error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
