"use client";

import {
	LiveKitRoom,
	RoomAudioRenderer,
	useVoiceAssistant,
	useRoomContext,
	useConnectionState,
	useChat,
	useTranscriptions,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Mic,
	MicOff,
	PhoneOff,
	Phone,
	Loader2,
	Send,
	MessageSquare,
	Camera,
	CameraOff,
	Monitor,
	MonitorUp,
} from "lucide-react";

export default function AgentPage() {
	const [token, setToken] = useState<string>("");
	const [isConnecting, setIsConnecting] = useState(false);
	const [isConnected, setIsConnected] = useState(false);

	const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

	const handleConnect = useCallback(async () => {
		setIsConnecting(true);
		try {
			const roomName = `luna-room-${Date.now()}`;
			const participantName = `user-${Math.random().toString(36).substring(2, 8)}`;

			const response = await fetch("/api/token", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ roomName, participantName }),
			});

			const data = await response.json();
			if (data.token) {
				setToken(data.token);
				setIsConnected(true);
			}
		} catch (error) {
			console.error("Failed to connect:", error);
		} finally {
			setIsConnecting(false);
		}
	}, []);

	const handleDisconnect = useCallback(() => {
		setToken("");
		setIsConnected(false);
	}, []);

	if (!livekitUrl) {
		return (
			<div className="flex flex-col flex-1 items-center justify-center bg-background">
				<div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 max-w-md text-center">
					<p className="text-destructive font-medium">
						NEXT_PUBLIC_LIVEKIT_URL is not configured.
					</p>
					<p className="text-muted-foreground text-sm mt-2">
						Add it to your .env.local file.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col flex-1 items-center justify-center bg-background min-h-screen">
			{!isConnected ? (
				<ConnectScreen
					onConnect={handleConnect}
					isConnecting={isConnecting}
				/>
			) : (
				<LiveKitRoom
					token={token}
					serverUrl={livekitUrl}
					audio={true}
					connectOptions={{ autoSubscribe: true }}
					onDisconnected={handleDisconnect}
					className="flex flex-col flex-1 w-full"
				>
					<AgentRoom onDisconnect={handleDisconnect} />
					<RoomAudioRenderer />
				</LiveKitRoom>
			)}
		</div>
	);
}

/* ─── Connect Screen ─── */
function ConnectScreen({
	onConnect,
	isConnecting,
}: {
	onConnect: () => void;
	isConnecting: boolean;
}) {
	return (
		<div className="flex flex-col items-center gap-8 p-8">
			<div className="flex flex-col items-center gap-3 text-center">
				<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
					<Phone className="h-8 w-8 text-primary" />
				</div>
				<h1 className="text-3xl font-semibold tracking-tight text-foreground">
					Luna AI
				</h1>
				<p className="text-muted-foreground max-w-sm">
					Start a voice conversation with Luna, your AI assistant with a
					lifelike avatar.
				</p>
			</div>
			<Button
				onClick={onConnect}
				disabled={isConnecting}
				size="lg"
				className="rounded-full px-8 gap-2"
			>
				{isConnecting ? (
					<>
						<Loader2 className="h-4 w-4 animate-spin" />
						Connecting...
					</>
				) : (
					<>
						<Phone className="h-4 w-4" />
						Start Conversation
					</>
				)}
			</Button>
		</div>
	);
}

/* ─── Chat Message Type ─── */
interface ChatMessage {
	id: string;
	sender: "user" | "agent";
	text: string;
	type: "text" | "transcription";
	timestamp: number;
}

/* ─── Agent Room (active session) ─── */
function AgentRoom({ onDisconnect }: { onDisconnect: () => void }) {
	const { videoTrack, state } = useVoiceAssistant();
	const room = useRoomContext();
	const connectionState = useConnectionState();
	const [isMicMuted, setIsMicMuted] = useState(false);
	const [isCameraOn, setIsCameraOn] = useState(false);
	const [isScreenShareOn, setIsScreenShareOn] = useState(false);
	const [isChatOpen, setIsChatOpen] = useState(false);
	const [chatInput, setChatInput] = useState("");
	const videoRef = useRef<HTMLVideoElement>(null);
	const localCameraRef = useRef<HTMLVideoElement>(null);
	const chatEndRef = useRef<HTMLDivElement>(null);

	// Built-in chat hook (for sending messages + receiving chat messages)
	const { chatMessages, send, isSending } = useChat();
	// Voice transcriptions hook (agent + user voice transcriptions)
	const transcriptions = useTranscriptions();

	// Merge chat messages and transcriptions into a unified timeline
	const allMessages = useMemo(() => {
		type UnifiedMessage = {
			id: string;
			isUser: boolean;
			text: string;
			timestamp: number;
		};

		const messages: UnifiedMessage[] = [];

		// Add chat messages
		for (const msg of chatMessages) {
			messages.push({
				id: msg.id ?? `chat-${msg.timestamp}`,
				isUser: msg.from?.identity === room.localParticipant?.identity,
				text: msg.message,
				timestamp: msg.timestamp,
			});
		}

		// Add transcriptions
		for (const tr of transcriptions) {
			// Render both final and interim transcriptions for real-time typing effect
			messages.push({
				id: tr.streamInfo?.id ?? `tr-${Date.now()}-${Math.random()}`,
				isUser: tr.participantInfo?.identity === room.localParticipant?.identity,
				text: tr.text,
				timestamp: tr.streamInfo?.timestamp ?? Date.now(),
			});
		}

		// Sort by timestamp
		messages.sort((a, b) => a.timestamp - b.timestamp);
		return messages;
	}, [chatMessages, transcriptions, room.localParticipant?.identity]);

	// Auto-scroll chat
	useEffect(() => {
		chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [allMessages]);

	// Attach avatar video track to video element
	useEffect(() => {
		if (videoTrack?.publication?.track && videoRef.current) {
			const mediaTrack = videoTrack.publication.track;
			mediaTrack.attach(videoRef.current);
			return () => {
				mediaTrack.detach(videoRef.current!);
			};
		}
	}, [videoTrack]);

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

	const toggleScreenShare = useCallback(async () => {
		if (room.localParticipant) {
			const newState = !isScreenShareOn;
			try {
				await room.localParticipant.setScreenShareEnabled(newState);
				setIsScreenShareOn(newState);
			} catch (e) {
				console.error("Failed to toggle screen share", e);
			}
		}
	}, [room, isScreenShareOn]);

	// Attach local camera track to PIP preview
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

	const agentStateLabel = (() => {
		switch (state) {
			case "listening":
				return "Listening...";
			case "thinking":
				return "Thinking...";
			case "speaking":
				return "Speaking...";
			case "connecting":
				return "Connecting...";
			default:
				return "Idle";
		}
	})();

	return (
		<div className="flex flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 gap-4">
			{/* Left: Avatar Video */}
			<div className="flex flex-col flex-1 gap-4">
				<div className="relative flex-1 flex items-center justify-center rounded-2xl bg-card border border-border overflow-hidden min-h-[300px] sm:min-h-[400px]">
					{videoTrack ? (
						<video
							ref={videoRef}
							autoPlay
							playsInline
							className="w-full h-full object-cover"
						/>
					) : (
						<div className="flex flex-col items-center gap-4 text-muted-foreground">
							<div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
								<Loader2 className="h-8 w-8 animate-spin text-primary" />
							</div>
							<p className="text-sm">
								{connectionState === ConnectionState.Connected
									? "Waiting for avatar..."
									: "Connecting..."}
							</p>
						</div>
					)}

					{/* Local Camera PIP Preview */}
					{isCameraOn && (
						<div className="absolute bottom-4 right-4 w-32 h-24 sm:w-40 sm:h-30 rounded-xl overflow-hidden border-2 border-primary/50 shadow-lg bg-card">
							<video
								ref={localCameraRef}
								autoPlay
								playsInline
								muted
								className="w-full h-full object-cover mirror"
								style={{ transform: "scaleX(-1)" }}
							/>
							<span className="absolute bottom-1 left-1.5 text-[9px] text-primary-foreground bg-primary/70 rounded px-1 py-0.5">You</span>
						</div>
					)}

					{/* Agent State Badge */}
					<div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-background/80 backdrop-blur-sm px-3 py-1.5 border border-border">
						<span
							className={`h-2 w-2 rounded-full ${
								state === "speaking"
									? "bg-primary animate-pulse"
									: state === "thinking"
										? "bg-yellow-500 animate-pulse"
										: state === "listening"
											? "bg-green-500"
											: "bg-muted-foreground"
							}`}
						/>
						<span className="text-xs font-medium text-foreground">
							{agentStateLabel}
						</span>
					</div>
				</div>

				{/* Controls */}
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
						onClick={toggleScreenShare}
						variant={isScreenShareOn ? "default" : "secondary"}
						size="icon"
						className="h-12 w-12 rounded-full"
						aria-label={isScreenShareOn ? "Stop sharing screen" : "Share screen"}
					>
						{isScreenShareOn ? (
							<MonitorUp className="h-5 w-5" />
						) : (
							<Monitor className="h-5 w-5" />
						)}
					</Button>

					<Button
						onClick={handleDisconnect}
						variant="destructive"
						size="icon"
						className="h-14 w-14 rounded-full"
						aria-label="End conversation"
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

			{/* Right: Chat Panel */}
			{isChatOpen && (
				<div className="flex flex-col w-full max-w-sm rounded-2xl bg-card border border-border overflow-hidden">
					{/* Chat Header */}
					<div className="flex items-center gap-2 px-4 py-3 border-b border-border">
						<MessageSquare className="h-4 w-4 text-primary" />
						<h2 className="text-sm font-semibold text-foreground">Chat</h2>
						<span className="text-xs text-muted-foreground ml-auto">
							{allMessages.length} messages
						</span>
					</div>

					{/* Chat Messages */}
					<ScrollArea className="flex-1 p-4 min-h-0">
						<div className="flex flex-col gap-3">
							{allMessages.length === 0 && (
								<p className="text-xs text-muted-foreground text-center py-8">
									Voice transcriptions and text messages will appear here.
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
										{msg.isUser ? "You" : "Luna"}
									</span>
									<div
										className={`rounded-xl px-3 py-2 max-w-[85%] text-sm ${
											msg.isUser
												? "bg-primary text-primary-foreground"
												: "bg-secondary text-secondary-foreground"
										}`}
									>
										{msg.text}
									</div>
								</div>
							))}
							<div ref={chatEndRef} />
						</div>
					</ScrollArea>

					{/* Chat Input */}
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
