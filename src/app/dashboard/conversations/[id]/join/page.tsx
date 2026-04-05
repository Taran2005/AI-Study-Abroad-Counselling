"use client";

import {
	LiveKitRoom,
	RoomAudioRenderer,
	useRoomContext,
	useConnectionState,
	useChat,
	useTranscriptions,
	useTracks,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	Mic,
	MicOff,
	PhoneOff,
	Loader2,
	Send,
	MessageSquare,
	Camera,
	CameraOff,
	ArrowLeft,
	Users,
} from "lucide-react";

export default function CounsellorJoinPage() {
	const params = useParams();
	const router = useRouter();
	const conversationId = params.id as string;

	const [token, setToken] = useState<string>("");
	const [roomName, setRoomName] = useState<string>("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [livekitUrl, setLivekitUrl] = useState<string>("");

	// Fetch conversation details and generate counsellor token
	useEffect(() => {
		async function init() {
			try {
				// 1. Get the conversation's room_name
				const convoRes = await fetch(`/api/conversations/${conversationId}`);
				if (!convoRes.ok) throw new Error("Conversation not found");
				const convoData = await convoRes.json();
				const convo = convoData.conversation;

				if (!convo?.room_name) throw new Error("No room name found");
				if (convo.status !== "live") throw new Error("This conversation has ended");

				setRoomName(convo.room_name);

				// 2. Generate a counsellor token for this room
				const tokenRes = await fetch("/api/token/counsellor", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						roomName: convo.room_name,
						counsellorName: "Counsellor",
					}),
				});

				if (!tokenRes.ok) throw new Error("Failed to generate token");
				const tokenData = await tokenRes.json();
				setToken(tokenData.token);
				setLivekitUrl(tokenData.livekitUrl);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to join call");
			} finally {
				setLoading(false);
			}
		}

		init();
	}, [conversationId]);

	const handleDisconnect = useCallback(() => {
		setToken("");
		router.push("/dashboard/conversations");
	}, [router]);

	if (loading) {
		return (
			<div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-background">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
					<p className="text-sm text-muted-foreground">Joining call...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-background gap-4">
				<div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 max-w-md text-center">
					<p className="text-destructive font-medium">{error}</p>
				</div>
				<Link href="/dashboard/conversations">
					<Button variant="outline" className="gap-2">
						<ArrowLeft className="w-4 h-4" />
						Back to Live Calls
					</Button>
				</Link>
			</div>
		);
	}

	return (
		<div className="flex flex-col flex-1 items-center justify-center bg-background min-h-screen">
			<LiveKitRoom
				token={token}
				serverUrl={livekitUrl}
				audio={true}
				connectOptions={{ autoSubscribe: true }}
				onDisconnected={handleDisconnect}
				className="flex flex-col flex-1 w-full"
			>
				<CounsellorRoom onDisconnect={handleDisconnect} />
				<RoomAudioRenderer />
			</LiveKitRoom>
		</div>
	);
}

/* ─── Counsellor Room (active session) ─── */
function CounsellorRoom({ onDisconnect }: { onDisconnect: () => void }) {
	const room = useRoomContext();
	const connectionState = useConnectionState();
	const [isMicMuted, setIsMicMuted] = useState(false);
	const [isCameraOn, setIsCameraOn] = useState(false);
	const [isChatOpen, setIsChatOpen] = useState(true);
	const [chatInput, setChatInput] = useState("");
	const localCameraRef = useRef<HTMLVideoElement>(null);
	const chatEndRef = useRef<HTMLDivElement>(null);

	// Tracks from other participants (student's camera, avatar, etc.)
	const tracks = useTracks(
		[Track.Source.Camera, Track.Source.ScreenShare],
		{ onlySubscribed: true },
	);

	// Find the student's camera track (not the counsellor's own, not the avatar's)
	const studentVideoTrack = useMemo(() => {
		return tracks.find(
			(t) =>
				t.participant.identity !== room.localParticipant?.identity &&
				!t.participant.identity.startsWith("anam-") &&
				t.source === Track.Source.Camera,
		);
	}, [tracks, room.localParticipant?.identity]);

	// Find the avatar video track
	const avatarVideoTrack = useMemo(() => {
		return tracks.find(
			(t) =>
				t.participant.identity.startsWith("anam-") &&
				t.source === Track.Source.Camera,
		);
	}, [tracks]);

	const studentVideoRef = useRef<HTMLVideoElement>(null);
	const avatarVideoRef = useRef<HTMLVideoElement>(null);

	// Attach student video track
	useEffect(() => {
		if (studentVideoTrack?.publication?.track && studentVideoRef.current) {
			const mediaTrack = studentVideoTrack.publication.track;
			mediaTrack.attach(studentVideoRef.current);
			return () => {
				mediaTrack.detach(studentVideoRef.current!);
			};
		}
	}, [studentVideoTrack]);

	// Attach avatar video track
	useEffect(() => {
		if (avatarVideoTrack?.publication?.track && avatarVideoRef.current) {
			const mediaTrack = avatarVideoTrack.publication.track;
			mediaTrack.attach(avatarVideoRef.current);
			return () => {
				mediaTrack.detach(avatarVideoRef.current!);
			};
		}
	}, [avatarVideoTrack]);

	// Chat and transcriptions
	const { chatMessages, send, isSending } = useChat();
	const transcriptions = useTranscriptions();

	const allMessages = useMemo(() => {
		type UnifiedMessage = {
			id: string;
			isUser: boolean;
			senderName: string;
			text: string;
			timestamp: number;
		};

		const messages: UnifiedMessage[] = [];

		for (const msg of chatMessages) {
			const identity = msg.from?.identity || "";
			messages.push({
				id: msg.id ?? `chat-${msg.timestamp}`,
				isUser: identity === room.localParticipant?.identity,
				senderName: identity.startsWith("counsellor-")
					? "You"
					: identity.startsWith("anam-")
						? "AI Agent"
						: "Student",
				text: msg.message,
				timestamp: msg.timestamp,
			});
		}

		for (const tr of transcriptions) {
			const identity = tr.participantInfo?.identity || "";
			messages.push({
				id: tr.streamInfo?.id ?? `tr-${Date.now()}-${Math.random()}`,
				isUser: identity === room.localParticipant?.identity,
				senderName: identity.startsWith("counsellor-")
					? "You"
					: identity.startsWith("anam-") || identity.startsWith("studybuddyai")
						? "AI Agent"
						: "Student",
				text: tr.text,
				timestamp: tr.streamInfo?.timestamp ?? Date.now(),
			});
		}

		messages.sort((a, b) => a.timestamp - b.timestamp);
		return messages;
	}, [chatMessages, transcriptions, room.localParticipant?.identity]);

	useEffect(() => {
		chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [allMessages]);

	const toggleMicrophone = useCallback(async () => {
		if (room.localParticipant) {
			await room.localParticipant.setMicrophoneEnabled(isMicMuted);
			setIsMicMuted(!isMicMuted);
		}
	}, [room, isMicMuted]);

	const toggleCamera = useCallback(async () => {
		if (room.localParticipant) {
			const newState = !isCameraOn;
			await room.localParticipant.setCameraEnabled(newState);
			setIsCameraOn(newState);
		}
	}, [room, isCameraOn]);

	useEffect(() => {
		if (!isCameraOn || !localCameraRef.current) return;
		const cameraPub = room.localParticipant?.getTrackPublication(Track.Source.Camera);
		if (cameraPub?.track) {
			cameraPub.track.attach(localCameraRef.current);
			return () => {
				cameraPub.track?.detach(localCameraRef.current!);
			};
		}
	}, [isCameraOn, room.localParticipant]);

	const handleDisconnect = useCallback(async () => {
		await room.disconnect();
		onDisconnect();
	}, [room, onDisconnect]);

	const handleSendMessage = useCallback(async () => {
		const text = chatInput.trim();
		if (!text) return;
		setChatInput("");
		try {
			await send(text);
		} catch (error) {
			console.error("Failed to send message:", error);
		}
	}, [chatInput, send]);

	// Count remote participants (excluding self)
	const participantCount = room.remoteParticipants?.size ?? 0;

	return (
		<div className="flex flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 gap-4">
			{/* Left: Video area */}
			<div className="flex flex-col flex-1 gap-4">
				{/* Counsellor header badge */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Link href="/dashboard/conversations">
							<Button variant="ghost" size="icon" className="h-8 w-8">
								<ArrowLeft className="h-4 w-4" />
							</Button>
						</Link>
						<Badge variant="outline" className="gap-1.5 rounded-full text-xs border-primary/25 text-primary">
							<span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
							Counsellor Mode
						</Badge>
					</div>
					<div className="flex items-center gap-2">
						<Badge variant="outline" className="gap-1.5 rounded-full text-xs">
							<Users className="w-3 h-3" />
							{participantCount + 1} in call
						</Badge>
					</div>
				</div>

				{/* Main video area — student camera or placeholder */}
				<div className="relative flex-1 flex items-center justify-center rounded-2xl bg-card border border-border overflow-hidden min-h-[300px] sm:min-h-[400px]">
					{studentVideoTrack ? (
						<video
							ref={studentVideoRef}
							autoPlay
							playsInline
							className="w-full h-full object-cover"
						/>
					) : (
						<div className="flex flex-col items-center gap-4 text-muted-foreground">
							<div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
								{connectionState === ConnectionState.Connected ? (
									<Users className="h-8 w-8 text-primary" />
								) : (
									<Loader2 className="h-8 w-8 animate-spin text-primary" />
								)}
							</div>
							<p className="text-sm">
								{connectionState === ConnectionState.Connected
									? "Student's camera is off"
									: "Connecting to room..."}
							</p>
						</div>
					)}

					{/* PIP: Local camera */}
					{isCameraOn && (
						<div className="absolute bottom-4 right-4 w-32 h-24 sm:w-40 sm:h-30 rounded-xl overflow-hidden border-2 border-primary/50 shadow-lg bg-card">
							<video
								ref={localCameraRef}
								autoPlay
								playsInline
								muted
								className="w-full h-full object-cover"
								style={{ transform: "scaleX(-1)" }}
							/>
							<span className="absolute bottom-1 left-1.5 text-[9px] text-primary-foreground bg-primary/70 rounded px-1 py-0.5">
								You
							</span>
						</div>
					)}

					{/* PIP: Avatar (if still in room) */}
					{avatarVideoTrack && (
						<div className="absolute top-4 right-4 w-28 h-20 rounded-xl overflow-hidden border border-border shadow-lg bg-card">
							<video
								ref={avatarVideoRef}
								autoPlay
								playsInline
								className="w-full h-full object-cover"
							/>
							<span className="absolute bottom-1 left-1.5 text-[9px] text-primary-foreground bg-primary/70 rounded px-1 py-0.5">
								AI Agent
							</span>
						</div>
					)}

					{/* Connection badge */}
					<div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-background/80 backdrop-blur-sm px-3 py-1.5 border border-border">
						<span
							className={`h-2 w-2 rounded-full ${
								connectionState === ConnectionState.Connected
									? "bg-green-500"
									: "bg-yellow-500 animate-pulse"
							}`}
						/>
						<span className="text-xs font-medium text-foreground">
							{connectionState === ConnectionState.Connected
								? "Connected"
								: "Connecting..."}
						</span>
					</div>
				</div>

				{/* Controls — same style as student page */}
				<div className="flex items-center justify-center gap-4 py-3">
					<Button
						onClick={toggleMicrophone}
						variant={isMicMuted ? "destructive" : "secondary"}
						size="icon"
						className="h-12 w-12 rounded-full"
						aria-label={isMicMuted ? "Unmute microphone" : "Mute microphone"}
					>
						{isMicMuted ? (
							<MicOff className="h-5 w-5" />
						) : (
							<Mic className="h-5 w-5" />
						)}
					</Button>

					<Button
						onClick={toggleCamera}
						variant={isCameraOn ? "default" : "secondary"}
						size="icon"
						className="h-12 w-12 rounded-full"
						aria-label={isCameraOn ? "Turn off camera" : "Turn on camera"}
					>
						{isCameraOn ? (
							<Camera className="h-5 w-5" />
						) : (
							<CameraOff className="h-5 w-5" />
						)}
					</Button>

					<Button
						onClick={handleDisconnect}
						variant="destructive"
						size="icon"
						className="h-14 w-14 rounded-full"
						aria-label="Leave call"
					>
						<PhoneOff className="h-6 w-6" />
					</Button>

					<Button
						onClick={() => setIsChatOpen(!isChatOpen)}
						variant={isChatOpen ? "default" : "secondary"}
						size="icon"
						className="h-12 w-12 rounded-full"
						aria-label="Toggle chat"
					>
						<MessageSquare className="h-5 w-5" />
					</Button>
				</div>
			</div>

			{/* Right: Chat Panel — replicates student page design */}
			{isChatOpen && (
				<div className="flex flex-col w-full max-w-sm rounded-2xl bg-card border border-border overflow-hidden h-[calc(100vh-120px)]">
					<div className="flex items-center gap-2 px-4 py-3 border-b border-border">
						<MessageSquare className="h-4 w-4 text-primary" />
						<h2 className="text-sm font-semibold text-foreground">
							Live Transcript
						</h2>
						<span className="text-xs text-muted-foreground ml-auto">
							{allMessages.length} messages
						</span>
					</div>

					<div className="flex-1 overflow-y-auto p-4 min-h-0">
						<div className="flex flex-col gap-3">
							{allMessages.length === 0 && (
								<p className="text-xs text-muted-foreground text-center py-8">
									Voice transcriptions will appear here once the conversation starts.
								</p>
							)}
							{allMessages.map((msg, idx) => (
								<div
									key={msg.id ?? idx}
									className={`flex flex-col gap-1 ${
										msg.isUser ? "items-end" : "items-start"
									}`}
								>
									<span className="text-[10px] text-muted-foreground uppercase tracking-wider">
										{msg.senderName}
									</span>
									<div
										className={`rounded-xl px-3 py-2 max-w-[85%] text-sm ${
											msg.isUser
												? "bg-primary text-primary-foreground"
												: msg.senderName === "Student"
													? "bg-chart-4/15 text-foreground border border-chart-4/20"
													: "bg-secondary text-secondary-foreground"
										}`}
									>
										{msg.text}
									</div>
								</div>
							))}
							<div ref={chatEndRef} />
						</div>
					</div>

					<div className="flex items-center gap-2 p-3 border-t border-border">
						<Input
							value={chatInput}
							onChange={(e) => setChatInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									handleSendMessage();
								}
							}}
							placeholder="Type a message..."
							className="flex-1 text-sm"
						/>
						<Button
							onClick={handleSendMessage}
							disabled={!chatInput.trim() || isSending}
							size="icon"
							className="h-9 w-9 rounded-lg shrink-0"
							aria-label="Send message"
						>
							<Send className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
