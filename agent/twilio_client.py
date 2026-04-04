"""
StudyBuddyAI WhatsApp Integration (Twilio)
=======================================
Sends post-call summary messages to students via WhatsApp using the Twilio API.

Configuration (via environment variables):
  TWILIO_ACCOUNT_SID    — Twilio Account SID
  TWILIO_AUTH_TOKEN      — Twilio Auth Token
  TWILIO_WHATSAPP_FROM   — Twilio WhatsApp sender (e.g. "whatsapp:+14155238886")

If Twilio credentials are not configured, all send operations are logged but
silently skipped — the pipeline never crashes because of a missing integration.
"""

import logging
import os
from typing import Optional

logger = logging.getLogger("studybuddyai-whatsapp")

# Lazy-load Twilio client to avoid import errors if the package isn't installed
_twilio_client = None
_TWILIO_CONFIGURED = False


def _init_twilio():
    """Initialize Twilio client lazily. Returns True if configured."""
    global _twilio_client, _TWILIO_CONFIGURED

    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")

    if not account_sid or not auth_token:
        logger.info("Twilio credentials not configured — WhatsApp integration disabled")
        _TWILIO_CONFIGURED = False
        return False

    try:
        from twilio.rest import Client
        _twilio_client = Client(account_sid, auth_token)
        _TWILIO_CONFIGURED = True
        logger.info("Twilio WhatsApp client initialized successfully")
        return True
    except ImportError:
        logger.warning("twilio package not installed — WhatsApp integration disabled")
        _TWILIO_CONFIGURED = False
        return False
    except Exception as e:
        logger.error(f"Failed to initialize Twilio client: {e}")
        _TWILIO_CONFIGURED = False
        return False


def _format_phone_for_whatsapp(phone: str) -> Optional[str]:
    """
    Normalize a phone number to WhatsApp format (whatsapp:+91XXXXXXXXXX).
    Handles common Indian phone number formats.
    """
    if not phone:
        return None

    # Strip whitespace and common separators
    cleaned = phone.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")

    # Already in whatsapp: format
    if cleaned.startswith("whatsapp:"):
        return cleaned

    # Remove leading + if present, we'll re-add it
    if cleaned.startswith("+"):
        cleaned = cleaned[1:]

    # Indian number without country code (10 digits)
    if len(cleaned) == 10 and cleaned[0] in "6789":
        cleaned = "91" + cleaned

    # Ensure it has a + prefix
    return f"whatsapp:+{cleaned}"


def _build_summary_message(
    student_name: str,
    extracted_data: dict,
    score_result: dict,
    conversation_id: str,
) -> str:
    """Build a clean, formatted WhatsApp message with the session summary."""

    name = student_name or "there"
    classification = "Unknown"

    total = (
        score_result.get("intent_score", 0) * 0.4
        + score_result.get("financial_score", 0) * 0.3
        + score_result.get("timeline_score", 0) * 0.3
    )

    if total >= 70:
        classification = "🔥 Hot Lead"
    elif total >= 40:
        classification = "☀️ Warm Lead"
    else:
        classification = "❄️ Cold Lead"

    # Build profile section
    profile_lines = []
    field_map = {
        "education_level": "📚 Education",
        "field_of_study": "📖 Field",
        "institution": "🏫 Institution",
        "target_countries": "🌍 Target Countries",
        "course_interest": "🎯 Course Interest",
        "preferred_intake": "📅 Preferred Intake",
        "test_type": "📝 Test",
        "test_score": "💯 Score",
        "budget_range": "💰 Budget",
        "timeline": "⏰ Timeline",
    }

    for key, label in field_map.items():
        value = extracted_data.get(key)
        if value:
            if isinstance(value, list):
                value = ", ".join(str(v) for v in value)
            profile_lines.append(f"{label}: {value}")

    profile_section = "\n".join(profile_lines) if profile_lines else "Data collection in progress"

    # Build recommended actions
    actions = score_result.get("recommended_actions", [])
    actions_section = ""
    if actions:
        numbered = "\n".join(f"  {i+1}. {a}" for i, a in enumerate(actions[:3]))
        actions_section = f"\n\n📋 *Recommended Next Steps:*\n{numbered}"

    message = f"""🎓 *StudyBuddyAI — Session Summary*

Hi {name}! Thank you for speaking with StudyBuddyAI, your AI study abroad counsellor.

Here's a summary of your session:

*Your Profile:*
{profile_section}

*Lead Score:* {int(total)}/100 ({classification}){actions_section}

💡 A human counsellor from our team will review your profile and reach out to you soon.

_Powered by StudyBuddyAI AI — Your Study Abroad Partner_"""

    return message


def send_whatsapp_summary(
    phone: str,
    student_name: str,
    extracted_data: dict,
    score_result: dict,
    conversation_id: str,
) -> bool:
    """
    Send a WhatsApp message with the session summary to the student.
    Returns True if sent successfully, False otherwise.
    This is a synchronous function — call via asyncio.to_thread() from async code.
    """
    global _twilio_client, _TWILIO_CONFIGURED

    # Initialize on first call
    if _twilio_client is None:
        _init_twilio()

    if not _TWILIO_CONFIGURED or _twilio_client is None:
        logger.info(f"WhatsApp skipped (not configured) — would send to {phone}")
        return False

    # Format the phone number
    to_number = _format_phone_for_whatsapp(phone)
    if not to_number:
        logger.warning("Cannot send WhatsApp — invalid phone number")
        return False

    from_number = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")

    # Build the message
    body = _build_summary_message(student_name, extracted_data, score_result, conversation_id)

    try:
        message = _twilio_client.messages.create(
            body=body,
            from_=from_number,
            to=to_number,
        )
        logger.info(f"WhatsApp sent to {to_number} — SID: {message.sid}")
        return True
    except Exception as e:
        logger.error(f"Failed to send WhatsApp to {to_number}: {e}")
        return False
