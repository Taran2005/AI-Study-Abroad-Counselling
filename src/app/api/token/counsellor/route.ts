import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";

/**
 * POST /api/token/counsellor
 *
 * Generates a LiveKit access token for a counsellor to join an existing room.
 * The counsellor identity is prefixed with "counsellor-" so the agent can
 * detect them joining and hand off the conversation.
 *
 * Body: { roomName: string, counsellorName?: string }
 */
export async function POST(request: Request) {
	try {
		const { roomName, counsellorName } = await request.json();

		if (!roomName) {
			return NextResponse.json(
				{ error: "roomName is required" },
				{ status: 400 },
			);
		}

		const livekitUrl = process.env.LIVEKIT_URL;
		const apiKey = process.env.LIVEKIT_API_KEY;
		const apiSecret = process.env.LIVEKIT_API_SECRET;

		if (!livekitUrl || !apiKey || !apiSecret) {
			return NextResponse.json(
				{ error: "LiveKit credentials are not configured" },
				{ status: 500 },
			);
		}

		const displayName = counsellorName || "Counsellor";
		const identity = `counsellor-${Date.now()}`;

		const token = new AccessToken(apiKey, apiSecret, {
			identity,
			name: displayName,
		});

		token.addGrant({
			room: roomName,
			roomJoin: true,
			canPublish: true,
			canSubscribe: true,
			canPublishData: true,
		});

		const jwt = await token.toJwt();

		return NextResponse.json({
			token: jwt,
			roomName,
			identity,
			livekitUrl,
		});
	} catch (error) {
		console.error("Counsellor token error:", error);
		return NextResponse.json(
			{ error: "Failed to generate counsellor token" },
			{ status: 500 },
		);
	}
}
