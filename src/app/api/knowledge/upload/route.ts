import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { chunkText, generateEmbeddings } from "@/lib/embeddings";

/**
 * POST /api/knowledge/upload
 *
 * Accepts a text document (title, content, category), chunks it,
 * generates embeddings, and stores everything in Supabase pgvector.
 *
 * Body: { title: string, content: string, category?: string }
 */
export async function POST(request: Request) {
	try {
		const { title, content, category } = await request.json();

		if (!title || !content) {
			return NextResponse.json(
				{ error: "title and content are required" },
				{ status: 400 },
			);
		}

		// 1. Chunk the document into embedding-sized pieces
		const chunks = chunkText(content, 800, 100);

		if (chunks.length === 0) {
			return NextResponse.json(
				{ error: "Document produced no content chunks" },
				{ status: 400 },
			);
		}

		// 2. Generate embeddings for all chunks in one batch call
		const embeddings = await generateEmbeddings(chunks);

		// 3. Insert the parent document record
		const { data: doc, error: docError } = await supabase
			.from("knowledge_docs")
			.insert({
				title,
				category: category || "general",
				chunk_count: chunks.length,
			})
			.select("id")
			.single();

		if (docError || !doc) {
			console.error("Failed to insert document:", docError);
			return NextResponse.json(
				{ error: "Failed to save document metadata" },
				{ status: 500 },
			);
		}

		// 4. Insert all chunks with their embeddings
		const chunkRows = chunks.map((text, i) => ({
			doc_id: doc.id,
			chunk_index: i,
			content: text,
			embedding: JSON.stringify(embeddings[i]),
		}));

		const { error: chunkError } = await supabase
			.from("knowledge_chunks")
			.insert(chunkRows);

		if (chunkError) {
			console.error("Failed to insert chunks:", chunkError);
			// Clean up the parent document
			await supabase.from("knowledge_docs").delete().eq("id", doc.id);
			return NextResponse.json(
				{ error: "Failed to save document chunks" },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			docId: doc.id,
			chunksCreated: chunks.length,
		});
	} catch (error) {
		console.error("Knowledge upload error:", error);
		return NextResponse.json(
			{ error: "Internal server error during upload" },
			{ status: 500 },
		);
	}
}
