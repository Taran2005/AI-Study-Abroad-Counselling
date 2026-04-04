import OpenAI from "openai";

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate an embedding vector for a single piece of text.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
	const response = await openai.embeddings.create({
		model: EMBEDDING_MODEL,
		input: text,
		dimensions: EMBEDDING_DIMENSIONS,
	});

	return response.data[0].embedding;
}

/**
 * Generate embedding vectors for multiple text chunks in a single batch call.
 */
export async function generateEmbeddings(
	texts: string[],
): Promise<number[][]> {
	const response = await openai.embeddings.create({
		model: EMBEDDING_MODEL,
		input: texts,
		dimensions: EMBEDDING_DIMENSIONS,
	});

	return response.data.map((d) => d.embedding);
}

/**
 * Split a large document into paragraphs / chunks suitable for embedding.
 *
 * Strategy:
 * 1. Split on double-newlines to get natural paragraphs.
 * 2. Merge very short paragraphs together.
 * 3. If a paragraph exceeds maxChunkSize, split it at sentence boundaries.
 */
export function chunkText(
	text: string,
	maxChunkSize = 1000,
	overlap = 100,
): string[] {
	// Normalize line endings
	const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

	// Split on double newlines to get natural paragraphs
	const rawParagraphs = normalized
		.split(/\n{2,}/)
		.map((p) => p.trim())
		.filter((p) => p.length > 0);

	const chunks: string[] = [];
	let currentChunk = "";

	for (const paragraph of rawParagraphs) {
		// If adding this paragraph would exceed the limit, finalize the current chunk
		if (
			currentChunk.length > 0 &&
			currentChunk.length + paragraph.length + 2 > maxChunkSize
		) {
			chunks.push(currentChunk.trim());
			// Keep the tail end as overlap for context continuity
			const words = currentChunk.split(/\s+/);
			const overlapWords = words.slice(
				-Math.ceil(overlap / 6),
			);
			currentChunk = `${overlapWords.join(" ")}\n\n${paragraph}`;
		} else {
			currentChunk =
				currentChunk.length > 0
					? `${currentChunk}\n\n${paragraph}`
					: paragraph;
		}

		// If the current chunk itself is very large, force-split at sentence boundaries
		if (currentChunk.length > maxChunkSize) {
			const sentences = currentChunk.match(/[^.!?]+[.!?]+/g) || [
				currentChunk,
			];
			let sentenceChunk = "";
			for (const sentence of sentences) {
				if (sentenceChunk.length + sentence.length > maxChunkSize) {
					if (sentenceChunk.length > 0) {
						chunks.push(sentenceChunk.trim());
					}
					sentenceChunk = sentence;
				} else {
					sentenceChunk += sentence;
				}
			}
			currentChunk = sentenceChunk;
		}
	}

	if (currentChunk.trim().length > 0) {
		chunks.push(currentChunk.trim());
	}

	return chunks;
}
