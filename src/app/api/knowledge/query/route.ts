import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateEmbedding } from "@/lib/embeddings";

/**
 * POST /api/knowledge/query
 *
 * Accepts a query string, embeds it, and performs a vector similarity search
 * in the knowledge_chunks table using Supabase's pgvector `match_knowledge_chunks` function.
 *
 * Body: { query: string, topK?: number }
 * Returns: { results: { content: string, similarity: number, doc_title: string }[] }
 */
export async function POST(request: Request) {
	try {
		const { query, topK = 5 } = await request.json();

		if (!query || typeof query !== "string") {
			return NextResponse.json(
				{ error: "query string is required" },
				{ status: 400 },
			);
		}

		// 1. Generate embedding for the query
		const queryEmbedding = await generateEmbedding(query);

		// 2. Call a Supabase RPC function that performs the vector similarity search
		const { data, error } = await supabase.rpc("match_knowledge_chunks", {
			query_embedding: JSON.stringify(queryEmbedding),
			match_count: topK,
			match_threshold: 0.5,
		});

		if (error) {
			console.error("Vector search error:", error);
			return NextResponse.json(
				{ error: "Vector similarity search failed" },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			results:
				data?.map(
					(row: {
						content: string;
						similarity: number;
						doc_title: string;
					}) => ({
						content: row.content,
						similarity: row.similarity,
						doc_title: row.doc_title,
					}),
				) || [],
		});
	} catch (error) {
		console.error("Knowledge query error:", error);
		return NextResponse.json(
			{ error: "Internal server error during query" },
			{ status: 500 },
		);
	}
}
