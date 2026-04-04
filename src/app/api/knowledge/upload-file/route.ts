import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { chunkText, generateEmbeddings } from "@/lib/embeddings";
import { extractText } from "unpdf";

/**
 * POST /api/knowledge/upload-file
 *
 * Accepts a multipart file upload (PDF or text), extracts text content,
 * chunks it, generates embeddings, and stores in Supabase pgvector.
 *
 * FormData:
 *   file: File      — PDF (.pdf) or text file (.txt, .md)
 *   title?: string   — Document title (defaults to file name)
 *   category?: string — Document category (defaults to "general")
 */
export async function POST(request: Request) {
	try {
		const formData = await request.formData();
		const file = formData.get("file") as File | null;
		const titleInput = formData.get("title") as string | null;
		const category = (formData.get("category") as string | null) || "general";

		if (!file) {
			return NextResponse.json(
				{ error: "No file provided" },
				{ status: 400 },
			);
		}

		const fileName = file.name;
		const fileType = file.type;
		const title = titleInput || fileName.replace(/\.(pdf|txt|md)$/i, "");

		let textContent = "";

		// Extract text from the file
		if (fileType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
			const buffer = await file.arrayBuffer();
			const result = await extractText(new Uint8Array(buffer));
			console.log("unpdf result keys:", Object.keys(result));
			console.log("unpdf text type:", typeof result.text, Array.isArray(result.text));

			if (Array.isArray(result.text)) {
				textContent = result.text.join("\n");
			} else if (typeof result.text === "string") {
				textContent = result.text;
			} else if (result.text) {
				textContent = String(result.text);
			}

			// Fallback: check if there are "pages" or other properties
			if (!textContent && typeof result === "object") {
				const allValues = Object.values(result)
					.flat()
					.filter((v) => typeof v === "string")
					.join("\n");
				if (allValues) textContent = allValues;
			}
		} else if (
			fileType === "text/plain" ||
			fileType === "text/markdown" ||
			fileName.toLowerCase().endsWith(".txt") ||
			fileName.toLowerCase().endsWith(".md")
		) {
			textContent = await file.text();
		} else {
			return NextResponse.json(
				{ error: `Unsupported file type: ${fileType}. Supported: .pdf, .txt, .md` },
				{ status: 400 },
			);
		}

		// Safety: ensure textContent is always a string
		if (typeof textContent !== "string") {
			textContent = String(textContent ?? "");
		}

		if (!textContent.trim()) {
			return NextResponse.json(
				{ error: "No text content could be extracted from the file" },
				{ status: 400 },
			);
		}

		// Chunk the content
		const chunks = chunkText(textContent, 800, 100);

		if (chunks.length === 0) {
			return NextResponse.json(
				{ error: "Document produced no content chunks" },
				{ status: 400 },
			);
		}

		// Generate embeddings
		const embeddings = await generateEmbeddings(chunks);

		// Insert the parent document
		const { data: doc, error: docError } = await supabase
			.from("knowledge_docs")
			.insert({
				title,
				category,
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

		// Insert all chunks with embeddings
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
			await supabase.from("knowledge_docs").delete().eq("id", doc.id);
			return NextResponse.json(
				{ error: "Failed to save document chunks" },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			docId: doc.id,
			title,
			chunksCreated: chunks.length,
			fileSize: file.size,
		});
	} catch (error) {
		console.error("File upload error:", error);
		return NextResponse.json(
			{ error: "Internal server error during file upload" },
			{ status: 500 },
		);
	}
}
