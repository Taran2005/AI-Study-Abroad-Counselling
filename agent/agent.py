"""
StudyBuddyAI AI Voice Agent with Anam Avatar
=========================================
A LiveKit voice agent for overseas education counselling using:
- STT: Deepgram Nova-3 (via LiveKit Inference)
- LLM: OpenAI GPT-4o (via OpenAI plugin - Responses API)
- TTS: ElevenLabs Multilingual v2 (via LiveKit Inference)
- Avatar: Anam (lifelike avatar video)
- Vision: Video frame sampling from user's camera/screen share
- RAG: Supabase pgvector via Next.js API for dynamic knowledge retrieval
"""

import asyncio
import logging
from datetime import datetime, timezone
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path

import httpx
from dotenv import load_dotenv

from data_pipeline import (
    create_conversation,
    update_conversation,
    extract_student_data,
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
from livekit.plugins import openai, anam, silero, deepgram, elevenlabs
from livekit.plugins.turn_detector.multilingual import MultilingualModel

load_dotenv(".env.local")

logger = logging.getLogger("studybuddyai-agent")
logger.setLevel(logging.DEBUG)
fh = logging.FileHandler("vision_debug.log", mode="w")
fh.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
fh.setFormatter(formatter)
logger.addHandler(fh)

# Load knowledge base as a fallback (used if RAG endpoint is unreachable)
_kb_path = Path(__file__).parent / "knowledge_base.txt"
_knowledge_base = _kb_path.read_text(encoding="utf-8") if _kb_path.exists() else ""

# Next.js RAG endpoint (defaults to localhost:3000 for development)
RAG_QUERY_URL = os.getenv("RAG_QUERY_URL", "http://localhost:3000/api/knowledge/query")


async def query_knowledge_base(query: str, top_k: int = 5) -> str:
    """
    Query the Next.js RAG endpoint for relevant knowledge chunks.
    Falls back to the static knowledge_base.txt if the endpoint is unreachable.
    """
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(
                RAG_QUERY_URL,
                json={"query": query, "topK": top_k},
            )
            response.raise_for_status()
            data = response.json()
            results = data.get("results", [])

            if results:
                context_parts = []
                for r in results:
                    title = r.get("doc_title", "Unknown")
                    content = r.get("content", "")
                    similarity = r.get("similarity", 0)
                    context_parts.append(
                        f"[Source: {title} | Relevance: {similarity:.2f}]\n{content}"
                    )
                return "\n\n---\n\n".join(context_parts)
            else:
                logger.info("RAG returned no results, falling back to static KB")
                return _knowledge_base
    except Exception as e:
        logger.warning(f"RAG query failed, using static KB fallback: {e}")
        return _knowledge_base


def send_confirmation_email(to_email: str, user_name: str, date: str, time: str):
    """Sends a beautifully formatted confirmation email to the user via SMTP."""
    sender_email = os.getenv("SENDER_EMAIL")
    sender_password = os.getenv("SENDER_PASSWORD")

    if not sender_email or not sender_password:
        logger.warning("SMTP credentials not configured. Skipping email dispatch.")
        return

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Your StudyBuddyAI Counselling Session is Confirmed!"
        msg["From"] = f"StudyBuddyAI AI <{sender_email}>"
        msg["To"] = to_email

        html_content = f"""
        <html>
          <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <div style="max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
              <div style="background: linear-gradient(135deg, #0d9488, #065f46); color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">🎓 Session Confirmed!</h1>
              </div>
              <div style="padding: 20px;">
                <p>Hello {user_name},</p>
                <p>Thank you for choosing StudyBuddyAI! Your personalised study abroad counselling session has been booked.</p>
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
                <p style="margin-top: 30px;">A certified education counsellor will join you at the scheduled time to discuss your study abroad options, university shortlisting, and application strategy.</p>
                <p>Warmest regards,<br><strong>StudyBuddyAI AI</strong><br>Your Study Abroad Partner</p>
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


# ============================================================
# StudyBuddyAI System Prompt
# ============================================================
STUDYBUDDYAI_SYSTEM_PROMPT = """You are StudyBuddyAI, a friendly and knowledgeable AI study abroad counsellor.
You specialise in helping Indian students explore education opportunities in the UK and Ireland.

Your personality: warm, encouraging, professional, and deeply knowledgeable about overseas education.
You are NOT a generic chatbot — you are a trained counsellor who understands the anxieties and excitement of studying abroad.

YOUR CORE RESPONSIBILITIES:
1. Help students understand their options for studying in the UK and Ireland.
2. Naturally gather information about the student during the conversation. Over the course of the chat, try to learn:
   - Their full name
   - Phone number (if they are willing to share)
   - Email address
   - Current location/city
   - Current education level (12th, UG, PG)
   - Field of study / course interest
   - Current institution and GPA/percentage
   - Target countries (UK, Ireland, or both)
   - Preferred intake (September or January)
   - English test status (IELTS/PTE/TOEFL score, or if they haven't taken one yet)
   - Budget range for tuition + living
   - Interest in scholarships
   - Application timeline / urgency
3. Answer any questions about universities, courses, fees, scholarships, visas, and living costs using your knowledge base.
4. Recommend 2-3 suitable universities based on their profile.
5. Offer to book a session with a human counsellor when appropriate.

CONVERSATION GUIDELINES:
- Keep responses concise and natural — this is a VOICE conversation, not a text chat.
- DO NOT dump all questions at once. Ask 1-2 questions at a time, naturally.
- Start with general questions (name, what are you looking to study?) before specific ones (budget, test scores).
- Be empathetic if the student seems confused or anxious. Reassure them.
- If a student doesn't have test scores yet, don't make them feel bad — guide them.
- Cite specific university data (fees, requirements) when relevant to build trust.
- Avoid complex formatting, emojis, asterisks, or symbols in your responses.

LANGUAGE ADAPTATION:
You MUST perfectly mirror the user's language and speaking style.
- If the user speaks purely in English, reply purely in English.
- If the user speaks purely in Hindi, reply purely in Hindi.
- If the user speaks in 'Hinglish' (mixing Hindi and English words in the same sentence), you MUST reply in entirely natural 'Hinglish'. Do not over-correct them to pure English.
- Write all Hindi words in Romanized form (e.g., 'mujhe', 'aap', 'namaste') not in Devanagari script.

VISION:
When you receive an image along with the user's message, describe what you see or answer questions about it naturally.
If they show you a marksheet, transcript, or test score report, read and interpret the relevant data.

BOOKING:
If someone asks about scheduling a consultation with a human counsellor, do NOT redirect them to a phone number.
Instead, ask for their full name, email address, and preferred date/time so you can use your `book_consultation` tool to schedule it immediately.
"""


class StudyBuddyAIAssistant(Agent):
    """StudyBuddyAI AI assistant persona with vision, RAG, and data pipeline capabilities."""

    @llm.function_tool(description="Book a consultation appointment with a human counsellor. Call this when the user explicitly agrees to book a time and provides their details.")
    async def book_consultation(
        self,
        user_name: str,
        user_email: str,
        date: str,
        time: str,
    ):
        """
        Book a consultation appointment for the student.
        
        Args:
            user_name: The student's full name.
            user_email: The student's email address.
            date: The preferred date mapping to a real calendar date (e.g. March 15th).
            time: The preferred time of the appointment.
        """
        logger.info(f"Booking consultation for {user_name} on {date} at {time}")
        await asyncio.to_thread(send_confirmation_email, user_email, user_name, date, time)
        return "Booking successful! The confirmation email has been sent."

    def __init__(self) -> None:
        self._latest_camera_frame = None
        self._latest_screen_frame = None
        self._camera_stream = None
        self._screen_stream = None
        self._tasks: list = []

        # ── Data Pipeline State ──
        self._conversation_id: str | None = None
        self._transcript: list[dict] = []
        self._extracted_data: dict = {}
        self._session_started_at: datetime = datetime.now(timezone.utc)
        self._user_turn_count: int = 0
        self._extraction_interval: int = 4  # Run extraction every N user turns

        # Build the initial system prompt with the static knowledge base as baseline
        instructions = (
            f"{STUDYBUDDYAI_SYSTEM_PROMPT}"
            f"\n\n--- KNOWLEDGE BASE (Baseline) ---\n"
            f"{_knowledge_base}"
        )

        super().__init__(instructions=instructions)

    @property
    def latest_frame(self):
        """Returns the screen frame if available, otherwise the camera frame."""
        return self._latest_screen_frame if self._latest_screen_frame else self._latest_camera_frame

    async def on_enter(self):
        """Called when the agent enters the session. Sets up video track subscription."""
        room = get_job_context().room
        logger.info("StudyBuddyAIAssistant on_enter: setting up video track handlers")

        # Check for existing video tracks from remote participants
        for participant in room.remote_participants.values():
            logger.info(f"Found remote participant: {participant.identity}")
            for publication in participant.track_publications.values():
                if (
                    publication.track
                    and publication.track.kind == rtc.TrackKind.KIND_VIDEO
                ):
                    if participant.identity == "anam-avatar-agent":
                        logger.info("Skipping anam-avatar-agent video track")
                        continue
                        
                    is_screen_share = publication.source == rtc.TrackSource.SOURCE_SCREENSHARE
                    logger.info(f"Found existing video track from {participant.identity} (Screen Share: {is_screen_share})")
                    self._create_video_stream(publication.track, is_screen_share)

        # Watch for new video tracks (camera or screen share)
        @room.on("track_subscribed")
        def on_track_subscribed(
            track: rtc.Track,
            publication: rtc.RemoteTrackPublication,
            participant: rtc.RemoteParticipant,
        ):
            if track.kind == rtc.TrackKind.KIND_VIDEO:
                if participant.identity == "anam-avatar-agent":
                    return
                
                is_screen_share = publication.source == rtc.TrackSource.SOURCE_SCREENSHARE
                logger.info(
                    f"New video track subscribed from {participant.identity}, source: {publication.source} (Screen Share: {is_screen_share})"
                )
                self._create_video_stream(track, is_screen_share)

    async def on_user_turn_completed(
        self, turn_ctx: ChatContext, new_message: ChatMessage
    ) -> None:
        """
        Inject the latest video frame AND RAG context into the user's message before sending to LLM.
        Also accumulates the transcript and triggers periodic background extraction.
        """
        # --- Transcript Accumulation ---
        user_text = ""
        if isinstance(new_message.content, str):
            user_text = new_message.content
        elif isinstance(new_message.content, list):
            user_text = " ".join(
                part for part in new_message.content if isinstance(part, str)
            )

        if user_text:
            self._transcript.append({
                "role": "user",
                "text": user_text,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            self._user_turn_count += 1
            logger.debug(f"Transcript now has {len(self._transcript)} entries (user turn #{self._user_turn_count})")

        # --- Periodic Background Extraction ---
        if (
            self._user_turn_count > 0
            and self._user_turn_count % self._extraction_interval == 0
            and self._conversation_id
        ):
            # Fire and forget — do NOT block the conversation
            asyncio.create_task(self._run_background_extraction())

        # --- RAG Injection ---
        if user_text:
            rag_context = await query_knowledge_base(user_text, top_k=3)
            if rag_context and rag_context != _knowledge_base:
                context_msg = ChatMessage(
                    role="system",
                    content=(
                        "The following is relevant context retrieved from the StudyBuddyAI knowledge base. "
                        "Use this to answer the student's question accurately:\n\n"
                        f"{rag_context}"
                    ),
                )
                turn_ctx.messages.insert(-1, context_msg)
                logger.info("Injected RAG context into conversation turn")

        # --- Vision Injection ---
        frame = self.latest_frame
        if frame:
            logger.info("Injecting video frame into voice user message for LLM")
            if isinstance(new_message.content, str):
                new_message.content = [new_message.content]
            new_message.content.append(ImageContent(image=frame))
            self._latest_camera_frame = None
            self._latest_screen_frame = None
        else:
            logger.debug("No video frame available for this voice turn")

    def on_agent_speech_committed(self, text: str) -> None:
        """
        Called when the agent finishes speaking a complete response.
        Accumulate the agent's turns into the transcript.
        """
        self._transcript.append({
            "role": "agent",
            "text": text,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        logger.debug(f"Agent turn recorded. Transcript: {len(self._transcript)} entries")

    async def _run_background_extraction(self) -> None:
        """
        Run data extraction in the background without blocking the conversation.
        Updates the conversation record with the latest extracted data.
        """
        try:
            logger.info(f"Running background extraction (turn #{self._user_turn_count})")
            new_data = await extract_student_data(self._transcript)
            if new_data:
                # Merge with existing data (new data takes precedence)
                self._extracted_data = {**self._extracted_data, **new_data}
                # Save to database
                if self._conversation_id:
                    await update_conversation(
                        self._conversation_id,
                        transcript=self._transcript,
                        extracted_data=self._extracted_data,
                    )
                logger.info(f"Background extraction complete: {len(self._extracted_data)} total data points")
        except Exception as e:
            logger.error(f"Background extraction failed: {e}")

    def _create_video_stream(self, track: rtc.Track, is_screen_share: bool = False):
        """Opens a VideoStream on the given track and continuously buffers the latest frame."""
        stream_type = "screen share" if is_screen_share else "camera"
        logger.info(f"Creating {stream_type} video stream for track: {track.sid}")

        # Close any existing stream of this type
        if is_screen_share and self._screen_stream is not None:
            self._screen_stream.close()
        elif not is_screen_share and self._camera_stream is not None:
            self._camera_stream.close()

        video_stream = rtc.VideoStream(track)
        if is_screen_share:
            self._screen_stream = video_stream
        else:
            self._camera_stream = video_stream

        async def read_stream():
            frame_count = 0
            async for event in video_stream:
                if is_screen_share:
                    self._latest_screen_frame = event.frame
                else:
                    self._latest_camera_frame = event.frame
                
                frame_count += 1
                if frame_count == 1:
                    logger.info(f"First {stream_type} video frame received and buffered")
                elif frame_count % 300 == 0:
                    logger.info(f"{stream_type.capitalize()} frames received: {frame_count}")

        task = asyncio.create_task(read_stream())
        task.add_done_callback(
            lambda t: self._tasks.remove(t) if t in self._tasks else None
        )
        self._tasks.append(task)


server = AgentServer()

# Global reference to the agent instance so the text_input_cb can access it
_agent_instance: StudyBuddyAIAssistant | None = None


async def vision_text_input_cb(
    session: AgentSession, event: room_io.TextInputEvent
) -> None:
    """Custom text input handler that injects the latest camera frame into text messages."""
    global _agent_instance
    
    logger.info(f"Text input received: {event.text}")
    
    # Build the user message content
    content: list = [event.text]
    
    # Inject the latest video frame if available
    frame = _agent_instance.latest_frame if _agent_instance else None
    if frame:
        logger.info("Injecting video frame into text chat message for LLM")
        content.append(ImageContent(image=frame))
        
        # Clear frames after sending to avoid duplicates
        _agent_instance._latest_camera_frame = None
        _agent_instance._latest_screen_frame = None
    else:
        logger.debug("No video frame available for text input")

    # Create a ChatMessage with both text and image
    user_msg = ChatMessage(role="user", content=content)
    
    # Interrupt any current speech and generate a reply
    await session.interrupt()
    session.generate_reply(user_input=user_msg)


@server.rtc_session(agent_name="studybuddyai-agent")
async def studybuddyai_agent(ctx: agents.JobContext):
    """Entry point for the StudyBuddyAI voice agent session."""
    global _agent_instance

    room_name = ctx.room.name
    logger.info(f"Starting StudyBuddyAI session in room: {room_name}")

    # Create the voice pipeline session
    session = AgentSession(
        stt=deepgram.STT(
            model="nova-3",
            language="hi" # Configured for thick Indian English and Hindi code-switching
        ),
        llm=openai.responses.LLM(model="gpt-4o"),
        tts=inference.TTS(
            model="elevenlabs/eleven_multilingual_v2",
            voice=os.getenv("ELEVENLABS_VOICE_ID", "pFZP5JQG7iQjIQuC4Bku"), # Default: Lily
        ),
        vad=silero.VAD.load(),
        turn_handling=TurnHandlingOptions(
            turn_detection=MultilingualModel(),
        ),
    )

    # Create and start the Anam avatar session
    avatar = anam.AvatarSession(
        persona_config=anam.PersonaConfig(
            name="StudyBuddyAI",
            avatarId=os.environ.get("ANAM_AVATAR_ID", "071b0286-4cce-4808-bee2-e642f1062de3"),
        ),
    )

    # Start avatar first — it joins the room as a separate participant
    await avatar.start(session, room=ctx.room)

    # Start the agent session with the user, using custom text input handler for vision
    _agent_instance = StudyBuddyAIAssistant()

    # ── Data Pipeline: Create conversation record ──
    conversation_id = await create_conversation(room_name)
    if conversation_id:
        _agent_instance._conversation_id = conversation_id
        _agent_instance._session_started_at = datetime.now(timezone.utc)
        logger.info(f"Linked conversation {conversation_id} to agent instance")
    else:
        logger.warning("Failed to create conversation record — pipeline will be limited")

    await session.start(
        room=ctx.room,
        agent=_agent_instance,
        room_options=room_io.RoomOptions(
            text_input=room_io.TextInputOptions(
                text_input_cb=vision_text_input_cb,
            ),
        ),
    )

    # ── Data Pipeline: Register disconnect handler ──
    @ctx.room.on("disconnected")
    async def on_room_disconnected():
        """Run the full post-call pipeline when the room disconnects."""
        agent = _agent_instance
        if agent and agent._conversation_id and agent._transcript:
            logger.info(f"Room disconnected — running post-call pipeline for {agent._conversation_id}")
            try:
                await run_post_call_pipeline(
                    conversation_id=agent._conversation_id,
                    transcript=agent._transcript,
                    started_at=agent._session_started_at,
                )
            except Exception as e:
                logger.error(f"Post-call pipeline failed: {e}")
        elif agent and agent._conversation_id:
            # Mark as completed even if no transcript
            await update_conversation(
                agent._conversation_id,
                status="completed",
                ended_at=datetime.now(timezone.utc).isoformat(),
            )
            logger.info("Room disconnected with empty transcript — marked as completed")

    # Generate an initial greeting
    await session.generate_reply(
        instructions=(
            "Greet the student warmly and introduce yourself as StudyBuddyAI, their AI study abroad counsellor. "
            "Mention that you specialise in UK and Ireland universities. "
            "Ask their name and what they are looking to study in a natural, friendly way."
        )
    )


if __name__ == "__main__":
    agents.cli.run_app(server)
