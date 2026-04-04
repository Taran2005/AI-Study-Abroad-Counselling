"""
StudyBuddyAI AI Voice Agent
========================
A LiveKit voice agent for overseas education counselling using:
- STT: Deepgram Nova-3 (multilingual, Indian English + Hindi)
- LLM: OpenAI GPT-4o (via Responses API)
- TTS: ElevenLabs Multilingual v2
- Avatar: Anam
- Vision: Camera + screen share frame injection
- Pipeline: Post-call data extraction, lead scoring, Slack + email chain reaction
"""

import asyncio
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

from livekit import agents, rtc
from livekit.agents import (
    AgentServer,
    AgentSession,
    Agent,
    ChatContext,
    ChatMessage,
    TurnHandlingOptions,
    get_job_context,
    room_io,
    llm,
    inference,
)
from livekit.agents.llm import ImageContent
from livekit.plugins import openai, anam, silero, deepgram, elevenlabs
from livekit.plugins.turn_detector.multilingual import MultilingualModel

from data_pipeline import run_post_call_pipeline, create_conversation

load_dotenv(".env.local")

logger = logging.getLogger("studybuddyai-agent")
logger.setLevel(logging.DEBUG)
fh = logging.FileHandler("vision_debug.log", mode="w")
fh.setFormatter(logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s"))
logger.addHandler(fh)

_kb_path = Path(__file__).parent / "knowledge_base.txt"
_knowledge_base = _kb_path.read_text(encoding="utf-8") if _kb_path.exists() else ""

_STUDYBUDDYAI_INSTRUCTIONS = (
    "You are Aria, StudyBuddyAI's AI study abroad counsellor. "
    "You help students from India navigate the entire overseas education journey — "
    "choosing the right country, university, course, and visa pathway for UK, Ireland, Canada, and Australia. "
    "You are warm, encouraging, and deeply knowledgeable. You speak like a trusted senior who has been through this. "
    "Your responses are concise and natural — no bullet points, no asterisks, no markdown. Just clear, friendly speech. "
    "\n\n"
    "CRITICAL — Language Mirroring: "
    "If the student speaks English, reply in English. "
    "If they speak Hindi, reply in Hindi (Romanized, e.g. 'aap', 'bilkul', 'achha'). "
    "If they speak Hinglish, match their mix exactly. Never over-correct to pure English. "
    "\n\n"
    "GOAL — Naturally collect this information during the conversation: "
    "student's name, phone number, email, current education level, field of study, institution, GPA, "
    "target countries, course interest, preferred intake (September/January), "
    "English test type and score (IELTS/PTE/TOEFL), budget range, scholarship interest, and application timeline. "
    "Do NOT ask for all of these at once — weave them into natural conversation. "
    "When discussing universities, reference specific options. "
    "When the student seems ready for next steps, mention they can book a follow-up call with a human counsellor. "
    "\n\n--- KNOWLEDGE BASE ---\n"
    f"{_knowledge_base}"
)


class StudyBuddyAIAgent(Agent):
    """StudyBuddyAI AI counsellor with vision capabilities and post-call pipeline."""

    def __init__(self) -> None:
        self._transcript: list[dict] = []
        self._conversation_id: str | None = None
        self._started_at: datetime | None = None
        self._latest_camera_frame = None
        self._latest_screen_frame = None
        self._camera_stream = None
        self._screen_stream = None
        self._tasks: list = []
        super().__init__(instructions=_STUDYBUDDYAI_INSTRUCTIONS)

    @property
    def latest_frame(self):
        return self._latest_screen_frame if self._latest_screen_frame else self._latest_camera_frame

    async def on_enter(self) -> None:
        """Set up video tracks and create conversation record in Supabase."""
        room = get_job_context().room
        self._started_at = datetime.now(timezone.utc)
        self._conversation_id = await create_conversation(room.name)
        logger.info(f"Conversation created: {self._conversation_id} | room: {room.name}")

        for participant in room.remote_participants.values():
            for publication in participant.track_publications.values():
                if (
                    publication.track
                    and publication.track.kind == rtc.TrackKind.KIND_VIDEO
                    and participant.identity != "anam-avatar-agent"
                ):
                    self._create_video_stream(
                        publication.track,
                        publication.source == rtc.TrackSource.SOURCE_SCREENSHARE,
                    )

        @room.on("track_subscribed")
        def on_track_subscribed(
            track: rtc.Track,
            publication: rtc.RemoteTrackPublication,
            participant: rtc.RemoteParticipant,
        ):
            if track.kind == rtc.TrackKind.KIND_VIDEO and participant.identity != "anam-avatar-agent":
                self._create_video_stream(
                    track,
                    publication.source == rtc.TrackSource.SOURCE_SCREENSHARE,
                )

    async def on_user_turn_completed(
        self, turn_ctx: ChatContext, new_message: ChatMessage
    ) -> None:
        """Accumulate transcript + inject video frame."""
        if isinstance(new_message.content, str):
            text = new_message.content
        elif isinstance(new_message.content, list):
            text = next((c for c in new_message.content if isinstance(c, str)), "")
        else:
            text = ""

        if text:
            self._transcript.append({"role": "user", "text": text})

        frame = self.latest_frame
        if frame:
            if isinstance(new_message.content, str):
                new_message.content = [new_message.content]
            new_message.content.append(ImageContent(image=frame))
            self._latest_camera_frame = None
            self._latest_screen_frame = None

    def _create_video_stream(self, track: rtc.Track, is_screen_share: bool = False) -> None:
        if is_screen_share and self._screen_stream:
            self._screen_stream.close()
        elif not is_screen_share and self._camera_stream:
            self._camera_stream.close()

        video_stream = rtc.VideoStream(track)
        if is_screen_share:
            self._screen_stream = video_stream
        else:
            self._camera_stream = video_stream

        async def read_stream():
            async for event in video_stream:
                if is_screen_share:
                    self._latest_screen_frame = event.frame
                else:
                    self._latest_camera_frame = event.frame

        task = asyncio.create_task(read_stream())
        task.add_done_callback(lambda t: self._tasks.remove(t) if t in self._tasks else None)
        self._tasks.append(task)


server = AgentServer()
_agent_instance: StudyBuddyAIAgent | None = None


async def vision_text_input_cb(
    session: AgentSession, event: room_io.TextInputEvent
) -> None:
    global _agent_instance
    content: list = [event.text]

    if _agent_instance:
        _agent_instance._transcript.append({"role": "user", "text": event.text})
        frame = _agent_instance.latest_frame
        if frame:
            content.append(ImageContent(image=frame))
            _agent_instance._latest_camera_frame = None
            _agent_instance._latest_screen_frame = None

    user_msg = ChatMessage(role="user", content=content)
    await session.interrupt()
    session.generate_reply(user_input=user_msg)


@server.rtc_session(agent_name="studybuddyai-agent")
async def studybuddyai_agent(ctx: agents.JobContext):
    global _agent_instance

    session = AgentSession(
        stt=deepgram.STT(model="nova-3", language="hi"),
        llm=openai.responses.LLM(model="gpt-4o"),
        tts=inference.TTS(
            model="elevenlabs/eleven_multilingual_v2",
            voice=os.getenv("ELEVENLABS_VOICE_ID", "pFZP5JQG7iQjIQuC4Bku"),
        ),
        vad=silero.VAD.load(),
        turn_handling=TurnHandlingOptions(turn_detection=MultilingualModel()),
    )

    avatar = anam.AvatarSession(
        persona_config=anam.PersonaConfig(
            name="Aria",
            avatarId=os.environ.get("ANAM_AVATAR_ID", "071b0286-4cce-4808-bee2-e642f1062de3"),
        ),
    )

    await avatar.start(session, room=ctx.room)

    _agent_instance = StudyBuddyAIAgent()
    await session.start(
        room=ctx.room,
        agent=_agent_instance,
        room_options=room_io.RoomOptions(
            text_input=room_io.TextInputOptions(text_input_cb=vision_text_input_cb),
        ),
    )

    await session.generate_reply(
        instructions=(
            "Greet the student warmly. Introduce yourself as Aria from StudyBuddyAI. "
            "Ask them where they're hoping to study abroad and what course they're interested in."
        )
    )

    # ── Trigger post-call pipeline on disconnect ───────────────────────────
    @ctx.room.on("disconnected")
    def on_room_disconnected():
        agent = _agent_instance
        if not agent or not agent._conversation_id or not agent._started_at:
            logger.warning("Session ended with no conversation data — skipping pipeline")
            return
        logger.info(
            f"Room disconnected — running pipeline for {agent._conversation_id} "
            f"({len(agent._transcript)} transcript entries)"
        )
        asyncio.create_task(
            run_post_call_pipeline(
                conversation_id=agent._conversation_id,
                transcript=agent._transcript,
                started_at=agent._started_at,
            )
        )


if __name__ == "__main__":
    agents.cli.run_app(server)
