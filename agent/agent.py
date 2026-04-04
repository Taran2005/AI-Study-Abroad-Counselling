"""
StudyBuddyAI AI Voice Agent
========================
A LiveKit voice agent for overseas education counselling using:
- STT: Deepgram Nova-3 (via LiveKit Inference)
- LLM: OpenAI GPT-4o (via OpenAI plugin - Responses API)
- TTS: ElevenLabs Multilingual v2 (via LiveKit Inference)
- Avatar: Anam (lifelike avatar video)
- Vision: Video frame sampling from user's camera/screen share
"""

import asyncio
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

import httpx
from dotenv import load_dotenv

from data_pipeline import (
    create_conversation,
    update_conversation,
    extract_student_data,
    analyze_sentiment,
    run_post_call_pipeline,
)

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
from livekit.agents.voice.events import ConversationItemAddedEvent, CloseEvent
from livekit.plugins import openai, anam, silero, deepgram, elevenlabs
from livekit.plugins.turn_detector.multilingual import MultilingualModel

load_dotenv(".env.local")

logger = logging.getLogger("studybuddyai-agent")
logger.setLevel(logging.DEBUG)
fh = logging.FileHandler("vision_debug.log", mode="w")
fh.setFormatter(
    logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
)
logger.addHandler(fh)

# Load knowledge base for system prompt injection
_kb_path = Path(__file__).parent / "knowledge_base.txt"
_knowledge_base = _kb_path.read_text(encoding="utf-8") if _kb_path.exists() else ""


def send_confirmation_email(to_email: str, user_name: str, date: str, time: str):
    """Sends a beautifully formatted confirmation email to the user via SMTP."""
    sender_email = os.getenv("SENDER_EMAIL")
    sender_password = os.getenv("SENDER_PASSWORD")

    if not sender_email or not sender_password:
        logger.warning("SMTP credentials not configured. Skipping email dispatch.")
        return

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = (
            "Your StudyBuddyAI AI Overseas Education Consultation is Confirmed!"
        )
        msg["From"] = f"StudyBuddyAI Counsellor <{sender_email}>"
        msg["To"] = to_email

        html_content = f"""
        <html>
          <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <div style="max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #0b2240; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">Booking Confirmed!</h1>
              </div>
              <div style="padding: 20px;">
                <p>Hello {user_name},</p>
                <p>Thank you for reaching out to StudyBuddyAI. I'm thrilled to confirm your dedicated university admissions consultation.</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Date:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">{date}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Time:</strong></td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">{time}</td>
                  </tr>
                </table>
                <p style="margin-top: 30px;">An expert overseas education counsellor will join you at the scheduled time to discuss your study abroad plans.</p>
                <p>Warmest regards,<br><strong>Luna (Virtual Counsellor)</strong><br>StudyBuddyAI</p>
              </div>
            </div>
          </body>
        </html>
        """
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, to_email, msg.as_string())

        logger.info(f"Confirmation email successfully sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")


class LunaAssistant(Agent):
    """Luna AI assistant persona with vision capabilities."""

    @llm.function_tool(
        description="Book a consultation appointment for the user. Call this when the user explicitly agrees to book a time and provides their details."
    )
    async def book_consultation(
        self,
        user_name: str,
        user_email: str,
        date: str,
        time: str,
    ):
        """
        Book a consultation appointment for the user.

        Args:
            user_name: The user's full name.
            user_email: The user's email address.
            date: The preferred date mapping to a real calendar date (e.g. March 15th).
            time: The preferred time of the appointment.
        """
        logger.info(f"Booking consultation for {user_name} on {date} at {time}")
        await asyncio.to_thread(
            send_confirmation_email, user_email, user_name, date, time
        )
        return "Booking successful! The confirmation email has been sent."

    @llm.function_tool(
        description="Search for university recommendations based on the student's profile and preferences. Call this when the student wants to know which universities would be a good fit, or when you have enough profile data to suggest options."
    )
    async def search_universities(
        self,
        query: str,
        country: str = "",
    ):
        """
        Search for matching universities using vector similarity.

        Args:
            query: A natural language description of what the student is looking for, including their field of study, budget, test scores, and preferences.
            country: Optional filter — 'UK' or 'Ireland'. Leave empty for both.
        """
        logger.info(f"Searching universities: query='{query}', country='{country}'")

        api_base = os.getenv("NEXTJS_API_URL", "http://localhost:3000")

        try:
            payload: dict = {"query": query, "maxResults": 3}
            if country:
                payload["country"] = country

            async with httpx.AsyncClient(timeout=12.0) as client:
                resp = await client.post(
                    f"{api_base}/api/universities/search",
                    json=payload,
                )
                resp.raise_for_status()
                data = resp.json()

            universities = data.get("universities", [])

            if not universities:
                return "I couldn't find matching universities in our database at the moment. Let me share some general recommendations based on my knowledge instead."

            # Format results for the LLM to speak naturally
            results = []
            for i, uni in enumerate(universities, 1):
                parts = [f"{i}. {uni.get('name', 'Unknown')}"]
                if uni.get("city"):
                    parts.append(
                        f"   Location: {uni['city']}, {uni.get('country', '')}"
                    )
                if uni.get("ranking"):
                    parts.append(f"   Ranking: #{uni['ranking']}")

                # Costs
                costs = uni.get("costs", {})
                if costs.get("tuition_min") or costs.get("tuition_max"):
                    currency = costs.get("currency", "GBP")
                    parts.append(
                        f"   Tuition: {currency} {costs.get('tuition_min', 'N/A')} - {costs.get('tuition_max', 'N/A')}"
                    )

                # Requirements
                reqs = uni.get("requirements", {})
                if reqs.get("ielts_min"):
                    parts.append(f"   IELTS Minimum: {reqs['ielts_min']}")

                # Scholarships
                scholarships = uni.get("scholarships", [])
                if scholarships:
                    names = [
                        s.get("name", "") for s in scholarships[:2] if s.get("name")
                    ]
                    if names:
                        parts.append(f"   Scholarships: {', '.join(names)}")

                results.append("\n".join(parts))

            return "Here are the top university matches:\n\n" + "\n\n".join(results)

        except Exception as e:
            logger.error(f"University search failed: {e}")
            return "I'm having trouble searching our university database right now. Let me share recommendations based on my general knowledge instead."

    @llm.function_tool(
        description="Search the internal PDF knowledge base for specific information, policies, visa rules, procedures, or facts that are not about searching for universities."
    )
    async def search_knowledge_base(
        self,
        query: str,
    ):
        """
        Query the PDF vector database for precise information.

        Args:
            query: The specific question or topic to search for in the PDFs.
        """
        logger.info(f"Searching knowledge base for: query='{query}'")

        api_base = os.getenv("NEXTJS_API_URL", "http://localhost:3000")

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(
                    f"{api_base}/api/knowledge/query",
                    json={"query": query, "topK": 3},
                )
                resp.raise_for_status()
                data = resp.json()

            results = data.get("results", [])

            if not results:
                return "I couldn't find any specific information about that in the knowledge base documents. Try answering generally or ask the user to clarify."

            # Format results
            formatted_chunks = []
            for i, res in enumerate(results, 1):
                doc_title = res.get("doc_title", "Unknown Document")
                content = res.get("content", "").strip()
                formatted_chunks.append(
                    f"--- From Document: {doc_title} ---\n{content}"
                )

            return (
                "Here is the information from our internal documents:\n\n"
                + "\n\n".join(formatted_chunks)
            )

        except Exception as e:
            logger.error(f"Knowledge base search failed: {e}")
            return "The database is currently unreachable. Rely on your general knowledge to assist the user."

    def __init__(self) -> None:
        self._transcript: list[dict] = []
        self._conversation_id: str | None = None
        self._started_at: datetime | None = None
        self._latest_camera_frame = None
        self._latest_screen_frame = None
        self._camera_stream = None
        self._screen_stream = None
        self._tasks: list = []
        super().__init__(
            instructions=(
                "You are StudyBuddyAI AI, an expert overseas education counsellor. "
                "Your job is to help students navigate studying abroad, specifically in the UK and Ireland. "
                "You are friendly, empathetic, and highly knowledgeable about university admissions, IELTS/PTE preparation, "
                "scholarships, visas, and living costs abroad. "
                "CONVERSATIONAL PACING (CRITICAL): Always ask ONLY ONE question at a time. Never overwhelm the student with multiple questions in a single response. Wait for their answer before moving to the next topic. "
                "SMART EXTRACTION: Through natural conversation, aim to gradually collect: Name, Education Level, Target Country, Course Interest, IELTS/PTE Score, and Budget. "
                "PROACTIVE VISION: If the student mentions their grades, percentage, or IELTS/PTE score, explicitly ask them to hold their marksheet or scorecard up to the camera so you can verify it. Describe what you see when they do! "
                "CRITICAL INSTRUCTION: If a user asks to search, find, or recommend universities, you MUST immediately call the `search_universities` tool. Do not just list options from memory if they ask for a search.\n"
                "CRITICAL INSTRUCTION: If a user asks about detailed procedures, visa policies, intricate document details, or anything specific not found in your standard memory, you MUST immediately call the `search_knowledge_base` tool to look it up in the PDF database."
            ),
        )

    @property
    def latest_frame(self):
        return (
            self._latest_screen_frame
            if self._latest_screen_frame
            else self._latest_camera_frame
        )

    async def on_enter(self) -> None:
        """Set up video tracks and create conversation record in Supabase."""
        room = get_job_context().room
        logger.info("StudyBuddyAIAssistant on_enter: setting up video track handlers")

        # Immediately create conversation so it appears LIVE on the dashboard
        self._conversation_id = await create_conversation(room.name)
        self._session_started_at = datetime.now(timezone.utc)

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
            if (
                track.kind == rtc.TrackKind.KIND_VIDEO
                and participant.identity != "anam-avatar-agent"
            ):
                self._create_video_stream(
                    track,
                    publication.source == rtc.TrackSource.SOURCE_SCREENSHARE,
                )

    async def on_user_turn_completed(
        self, turn_ctx: ChatContext, new_message: ChatMessage
    ) -> None:
        """Inject the latest video frame into the user's VOICE message before sending to LLM."""
        frame = self.latest_frame
        if frame:
            if isinstance(new_message.content, str):
                new_message.content = [new_message.content]
            new_message.content.append(ImageContent(image=frame))
            self._latest_camera_frame = None
            self._latest_screen_frame = None
        else:
            logger.debug("No video frame available for this voice turn")

    def _create_video_stream(self, track: rtc.Track, is_screen_share: bool = False):
        """Opens a VideoStream on the given track and continuously buffers the latest frame."""
        stream_type = "screen share" if is_screen_share else "camera"
        logger.info(f"Creating {stream_type} video stream for track: {track.sid}")

        # Close any existing stream of this type
        if is_screen_share and self._screen_stream is not None:
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
        task.add_done_callback(
            lambda t: self._tasks.remove(t) if t in self._tasks else None
        )
        self._tasks.append(task)


server = AgentServer()

# Global reference to the agent instance so the text_input_cb can access it
_agent_instance: LunaAssistant | None = None


async def vision_text_input_cb(
    session: AgentSession, event: room_io.TextInputEvent
) -> None:
    global _agent_instance
    content: list = [event.text]

    # Note: Transcript is already captured via conversation_item_added event
    # Only add video frame if available
    if _agent_instance:
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
    """Entry point for the Luna voice agent session."""
    global _agent_instance

    room_name = ctx.room.name
    logger.info(f"Starting StudyBuddyAI session in room: {room_name}")

    session = AgentSession(
        stt=deepgram.STT(model="nova-3", language="hi"),
        llm=openai.responses.LLM(model="gpt-4o"),
        tts=openai.TTS(voice="alloy"),
        vad=silero.VAD.load(),
        turn_handling=TurnHandlingOptions(turn_detection=MultilingualModel()),
    )

    # avatar = anam.AvatarSession(
    #     persona_config=anam.PersonaConfig(
    #         name="Luna",
    #         avatarId=os.environ.get("ANAM_AVATAR_ID", "071b0286-4cce-4808-bee2-e642f1062de3"),
    #     ),
    # )

    # await avatar.start(session, room=ctx.room)

    # Start the agent session with the user, using custom text input handler for vision
    _agent_instance = LunaAssistant()
    await _agent_instance.on_enter()
    await session.start(
        room=ctx.room,
        agent=_agent_instance,
        room_options=room_io.RoomOptions(
            text_input=room_io.TextInputOptions(text_input_cb=vision_text_input_cb),
        ),
    )

    # ── Live Transcript Capture ──
    @session.on("conversation_item_added")
    def _on_conversation_item_added(event: ConversationItemAddedEvent):
        """Capture every user/assistant message into the local transcript list."""
        if not isinstance(event.item, llm.ChatMessage):
            return
        msg = event.item
        if msg.role not in ("user", "assistant"):
            return
        # Extract text content
        text = ""
        if isinstance(msg.content, str):
            text = msg.content
        elif isinstance(msg.content, list):
            text = " ".join(str(c) for c in msg.content if isinstance(c, str))
        if not text.strip():
            return
        _agent_instance._transcript.append(
            {
                "role": msg.role,
                "text": text.strip(),
                "ts": datetime.now(timezone.utc).isoformat(),
            }
        )
        logger.debug(f"Transcript captured: [{msg.role}] {text[:80]}...")

        # Immediately push transcript to DB for near-real-time dashboard updates
        async def _push_transcript():
            agent = _agent_instance
            if agent._conversation_id:
                try:
                    await update_conversation(
                        agent._conversation_id,
                        transcript=list(agent._transcript),
                    )
                except Exception as e:
                    logger.debug(f"Immediate transcript push failed (non-fatal): {e}")

        asyncio.create_task(_push_transcript())

    # ── Periodic Live Sync (every 5 seconds) ──
    async def _live_sync_loop():
        """Background loop: push transcript + sentiment + extracted data to DB."""
        agent = _agent_instance
        while True:
            await asyncio.sleep(5)
            if not agent._conversation_id or not agent._transcript:
                continue
            try:
                transcript = list(agent._transcript)  # snapshot
                # Run extraction and sentiment in parallel
                extracted, (sentiment_entries, _) = await asyncio.gather(
                    extract_student_data(transcript),
                    analyze_sentiment(transcript),
                )
                await update_conversation(
                    agent._conversation_id,
                    transcript=transcript,
                    extracted_data=extracted,
                    sentiment_log=sentiment_entries,
                )
                logger.info(
                    f"Live sync: pushed {len(transcript)} msgs, {len(extracted)} fields"
                )
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Live sync failed (non-fatal): {e}")

    sync_task = asyncio.create_task(_live_sync_loop())

    _pipeline_ran = False

    async def _run_close_pipeline():
        nonlocal _pipeline_ran
        if _pipeline_ran:
            return
        _pipeline_ran = True
        sync_task.cancel()

        agent = _agent_instance
        if (
            agent
            and getattr(agent, "_conversation_id", None)
            and getattr(agent, "_transcript", None)
        ):
            logger.info(
                f"Session ended — running post-call pipeline for {agent._conversation_id}"
            )
            try:
                await run_post_call_pipeline(
                    conversation_id=agent._conversation_id,
                    transcript=agent._transcript,
                    started_at=getattr(agent, "_session_started_at", None),
                )
            except Exception as e:
                logger.error(f"Post-call pipeline failed: {e}")
        elif agent and getattr(agent, "_conversation_id", None):
            await update_conversation(
                agent._conversation_id,
                status="completed",
                ended_at=datetime.now(timezone.utc).isoformat(),
            )
            logger.info("Session ended with empty transcript — marked as completed")

    # ── Session Close: Primary handler ──
    @session.on("close")
    def _on_session_close(event: CloseEvent):
        asyncio.create_task(_run_close_pipeline())

    # ── Room Disconnect: Fallback handler ──
    @ctx.room.on("disconnected")
    def _on_room_disconnected():
        asyncio.create_task(_run_close_pipeline())

    # Generate an initial greeting
    await session.generate_reply(
        instructions="Greet the user warmly and introduce yourself as StudyBuddyAI. Offer your assistance."
    )


if __name__ == "__main__":
    agents.cli.run_app(server)
