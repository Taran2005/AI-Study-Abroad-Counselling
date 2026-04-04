import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * DELETE /api/knowledge/[id]
 *
 * Deletes a knowledge document and all its associated chunks.
 */
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		if (!id) {
			return NextResponse.json(
				{ error: "Document id is required" },
				{ status: 400 },
			);
		}

		// Delete chunks first (foreign key dependency)
		const { error: chunkError } = await supabase
			.from("knowledge_chunks")
			.delete()
			.eq("doc_id", id);

		if (chunkError) {
			console.error("Failed to delete chunks:", chunkError);
			return NextResponse.json(
				{ error: "Failed to delete document chunks" },
				{ status: 500 },
			);
		}

		// Delete the parent document
		const { error: docError } = await supabase
			.from("knowledge_docs")
			.delete()
			.eq("id", id);

		if (docError) {
			console.error("Failed to delete document:", docError);
			return NextResponse.json(
				{ error: "Failed to delete document" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Knowledge delete error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
