import { AccessToken, AgentDispatchClient } from "livekit-server-sdk";
import { NextResponse } from "next/server";

/**
 * POST /api/token
 *
 * Generates a LiveKit access token for the client and dispatches
 * the Luna agent into the room.
 */
export async function POST(request: Request) {
	try {
		const { roomName, participantName } = await request.json();

		if (!roomName || !participantName) {
			return NextResponse.json(
				{ error: "roomName and participantName are required" },
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

		// Generate access token for the user
		const token = new AccessToken(apiKey, apiSecret, {
			identity: participantName,
			name: participantName,
		});

		token.addGrant({
			room: roomName,
			roomJoin: true,
			canPublish: true,
			canSubscribe: true,
			canPublishData: true,
		});

		const jwt = await token.toJwt();

		// Dispatch the Luna agent into the room
		const dispatchClient = new AgentDispatchClient(livekitUrl, apiKey, apiSecret);
		await dispatchClient.createDispatch(roomName, "luna-agent");

		return NextResponse.json({ token: jwt });
	} catch (error) {
		console.error("Token/dispatch error:", error);
		return NextResponse.json(
			{ error: "Failed to generate token or dispatch agent" },
			{ status: 500 },
		);
	}
}
