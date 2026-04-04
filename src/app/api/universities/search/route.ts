import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import OpenAI from "openai";

const openai = new OpenAI();

/**
 * POST /api/universities/search
 *
 * Vector-based university search using pgvector.
 * Takes a student's profile/query and returns the most relevant universities.
 *
 * Body: {
 *   query: string,        // Natural language description of what the student wants
 *   country?: string,     // 'UK' | 'Ireland' | null for both
 *   maxResults?: number   // Defaults to 3
 * }
 */
export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { query, country, maxResults = 3 } = body;

		if (!query) {
			return NextResponse.json(
				{ error: "query is required" },
				{ status: 400 },
			);
		}

		// Generate embedding for the query
		const embeddingRes = await openai.embeddings.create({
			model: "text-embedding-3-small",
			input: query,
		});

		const queryEmbedding = embeddingRes.data[0].embedding;

		// Use the match_universities RPC function
		const { data: matches, error } = await supabase.rpc(
			"match_universities",
			{
				query_embedding: queryEmbedding,
				match_count: maxResults,
				match_threshold: 0.3,
			},
		);

		if (error) {
			console.error("University search RPC error:", error);
			// Fallback: direct query without vector search
			let fallbackQuery = supabase
				.from("university_profiles")
				.select("id, name, country, city, ranking, courses, requirements, costs, scholarships")
				.limit(maxResults);

			if (country) {
				fallbackQuery = fallbackQuery.eq("country", country);
			}

			const { data: fallbackData, error: fallbackError } = await fallbackQuery;

			if (fallbackError) {
				return NextResponse.json(
					{ error: "University search failed" },
					{ status: 500 },
				);
			}

			return NextResponse.json({
				universities: fallbackData || [],
				method: "fallback",
			});
		}

		// Filter by country if specified
		let results = matches || [];
		if (country) {
			results = results.filter(
				(u: { country: string }) =>
					u.country.toLowerCase() === country.toLowerCase(),
			);
		}

		return NextResponse.json({
			universities: results,
			method: "vector",
		});
	} catch (error) {
		console.error("University search error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * GET /api/universities/search
 *
 * List all universities, optionally filtered by country.
 * Query params: country, limit
 */
export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const country = searchParams.get("country");
		const limit = parseInt(searchParams.get("limit") || "20", 10);

		let query = supabase
			.from("university_profiles")
			.select("id, name, country, city, ranking, courses, requirements, costs, scholarships, website")
			.order("ranking", { ascending: true, nullsFirst: false })
			.limit(limit);

		if (country) {
			query = query.eq("country", country);
		}

		const { data, error } = await query;

		if (error) {
			console.error("Failed to list universities:", error);
			return NextResponse.json(
				{ error: "Failed to list universities" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ universities: data || [] });
	} catch (error) {
		console.error("Universities list error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
