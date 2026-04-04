"""
Luna AI Voice Agent with Anam Avatar
=====================================
A LiveKit voice agent using:
- STT: Deepgram Nova-3 (via LiveKit Inference)
- LLM: OpenAI GPT-4o (via OpenAI plugin - Responses API)
- TTS: Cartesia Sonic-3 (via LiveKit Inference)
- Avatar: Anam (lifelike avatar video)
- Vision: Video frame sampling from user's camera/screen share
"""

import asyncio
import logging
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
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

load_dotenv(".env.local")

logger = logging.getLogger("luna-agent")
logger.setLevel(logging.DEBUG)
fh = logging.FileHandler("vision_debug.log", mode="w")
fh.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
fh.setFormatter(formatter)
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
        msg["Subject"] = "Your ReeLabs Stem Cell Consultation is Confirmed!"
        msg["From"] = f"ReeLabs Concierge <{sender_email}>"
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
                <p>Thank you for reaching out to ReeLabs. I'm thrilled to confirm your dedicated stem cell consultation.</p>
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
                <p style="margin-top: 30px;">An expert consultant will join you at the scheduled time to discuss our 10 sources of stem cell banking and therapy options.</p>
                <p>Warmest regards,<br><strong>Luna (Virtual Consultant)</strong><br>ReeLabs</p>
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

    @llm.function_tool(description="Book a consultation appointment for the user. Call this when the user explicitly agrees to book a time and provides their details.")
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
        await asyncio.to_thread(send_confirmation_email, user_email, user_name, date, time)
        return "Booking successful! The confirmation email has been sent."

    def __init__(self) -> None:
        self._latest_camera_frame = None
        self._latest_screen_frame = None
        self._camera_stream = None
        self._screen_stream = None
        self._tasks: list = []
        super().__init__(
            instructions=(
                "You are Luna, ReeLabs' virtual stem cell consultant. "
                "You are warm, empathetic, and deeply knowledgeable about stem cell "
                "banking, stem cell therapy, and the Golden Vial Anti-Ageing program. "
                "You help expectant parents understand stem cell banking, guide patients "
                "exploring therapy options, and answer questions about ReeLabs' services. "
                "Your responses are concise and natural — avoid complex formatting, "
                "emojis, asterisks, or other symbols. Speak clearly and helpfully. "
                "CRITICAL: You must perfectly mirror the user's language and speaking style. "
                "If the user speaks purely in English, reply purely in English. "
                "If the user speaks purely in Hindi, reply purely in Hindi. "
                "If the user speaks in 'Hinglish' (mixing Hindi and English words in the same sentence), "
                "you MUST reply in entirely natural 'Hinglish'. Do not over-correct them to pure English. "
                "Write all Hindi words in Romanized form (e.g., 'mujhe', 'aap', 'namaste') not in Devanagari script. "
                "When you receive an image along with the user's message, describe "
                "what you see or answer questions about it naturally. "
                "Always cite specific ReeLabs stats (13 patents, 10 sources, 99% recovery rate, etc.) "
                "when relevant to build trust. "
                "If someone asks about scheduling a consultation or making an appointment, "
                "do NOT redirect them to a phone number. Instead, you MUST ask for their full name, "
                "email address, and preferred date/time so you can use your `book_consultation` tool to schedule it immediately."
                "\n\n--- KNOWLEDGE BASE ---\n"
                f"{_knowledge_base}"
            ),
        )

    @property
    def latest_frame(self):
        """Returns the screen frame if available, otherwise the camera frame."""
        return self._latest_screen_frame if self._latest_screen_frame else self._latest_camera_frame

    async def on_enter(self):
        """Called when the agent enters the session. Sets up video track subscription."""
        room = get_job_context().room
        logger.info("LunaAssistant on_enter: setting up video track handlers")

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
        """Inject the latest video frame into the user's VOICE message before sending to LLM."""
        frame = self.latest_frame
        if frame:
            logger.info("Injecting video frame into voice user message for LLM")
            if isinstance(new_message.content, str):
                new_message.content = [new_message.content]
            new_message.content.append(ImageContent(image=frame))
            
            # Clear frames after sending to avoid duplicates
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
_agent_instance: LunaAssistant | None = None


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


@server.rtc_session(agent_name="luna-agent")
async def luna_agent(ctx: agents.JobContext):
    """Entry point for the Luna voice agent session."""
    global _agent_instance

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
            name="Luna",
            avatarId=os.environ.get("ANAM_AVATAR_ID", "071b0286-4cce-4808-bee2-e642f1062de3"),
        ),
    )

    # Start avatar first — it joins the room as a separate participant
    await avatar.start(session, room=ctx.room)

    # Start the agent session with the user, using custom text input handler for vision
    _agent_instance = LunaAssistant()
    await session.start(
        room=ctx.room,
        agent=_agent_instance,
        room_options=room_io.RoomOptions(
            text_input=room_io.TextInputOptions(
                text_input_cb=vision_text_input_cb,
            ),
        ),
    )

    # Generate an initial greeting
    await session.generate_reply(
        instructions="Greet the user warmly and introduce yourself as Luna. Offer your assistance."
    )


if __name__ == "__main__":
    agents.cli.run_app(server)

