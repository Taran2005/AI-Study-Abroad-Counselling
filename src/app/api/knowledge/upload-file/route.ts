import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { chunkText, generateEmbeddings } from "@/lib/embeddings";

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
			// For PDFs, extract raw text (basic extraction)
			const buffer = await file.arrayBuffer();
			textContent = await extractTextFromPdf(Buffer.from(buffer));
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

/**
 * Basic PDF text extraction.
 * Scans the raw PDF binary for text streams and extracts readable content.
 * Works for most text-based PDFs (not scanned images).
 */
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
	const text = buffer.toString("latin1");
	const textParts: string[] = [];

	// Extract text between BT (Begin Text) and ET (End Text) operators
	const btEtRegex = /BT\s([\s\S]*?)ET/g;
	let match: RegExpExecArray | null;

	while ((match = btEtRegex.exec(text)) !== null) {
		const block = match[1];
		// Extract text from Tj, TJ, ' and " operators
		const tjRegex = /\(([^)]*)\)\s*(?:Tj|'|")/g;
		let tjMatch: RegExpExecArray | null;
		while ((tjMatch = tjRegex.exec(block)) !== null) {
			textParts.push(tjMatch[1]);
		}

		// Handle TJ arrays: [(text1) 123 (text2)] TJ
		const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
		let arrMatch: RegExpExecArray | null;
		while ((arrMatch = tjArrayRegex.exec(block)) !== null) {
			const innerRegex = /\(([^)]*)\)/g;
			let innerMatch: RegExpExecArray | null;
			while ((innerMatch = innerRegex.exec(arrMatch[1])) !== null) {
				textParts.push(innerMatch[1]);
			}
		}
	}

	// Decode common PDF escape sequences  
	let decoded = textParts.join(" ")
		.replace(/\\n/g, "\n")
		.replace(/\\r/g, "\r")
		.replace(/\\t/g, "\t")
		.replace(/\\\(/g, "(")
		.replace(/\\\)/g, ")")
		.replace(/\\\\/g, "\\");

	// Clean up excessive whitespace
	decoded = decoded
		.split("\n")
		.map(line => line.trim())
		.filter(line => line.length > 0)
		.join("\n");

	return decoded;
}
