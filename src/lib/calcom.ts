/**
 * Cal.com API Client
 * ==================
 * Server-side utility to query availability and create bookings
 * on the counsellor's Cal.com calendar.
 *
 * Uses v1 API for slots (personal API keys) and v2 for bookings.
 *
 * Requires env vars:
 *   CAL_API_KEY      — Cal.com API key (cal_live_...)
 *   CAL_BOOKING_URL  — e.g. https://cal.com/taran-codes/studybuddyai-follow-up-call
 */

const CAL_V1_BASE = "https://api.cal.com/v1";
const CAL_V2_BASE = "https://api.cal.com/v2";
const CAL_API_VERSION = "2024-08-13";

function getApiKey(): string {
  const apiKey = process.env.CAL_API_KEY;
  if (!apiKey) throw new Error("CAL_API_KEY is not configured");
  return apiKey;
}

function getV2Headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/json",
    "cal-api-version": CAL_API_VERSION,
  };
}

/**
 * Parse the Cal.com booking URL to extract the username and event slug.
 * e.g. "https://cal.com/taran-codes/studybuddyai-follow-up-call"
 *   → { username: "taran-codes", eventSlug: "studybuddyai-follow-up-call" }
 */
export function parseBookingUrl(): { username: string; eventSlug: string } {
  const url = process.env.CAL_BOOKING_URL ?? "";
  // Remove trailing slash, strip protocol+host
  const path = url.replace(/\/$/, "").replace(/^https?:\/\/[^/]+/, "");
  const parts = path.split("/").filter(Boolean);

  if (parts.length < 2) {
    throw new Error(
      `CAL_BOOKING_URL must be in format https://cal.com/<username>/<event-slug>. Got: ${url}`,
    );
  }

  return { username: parts[0], eventSlug: parts[1] };
}

/**
 * Get the event type ID and duration by querying the user's event types.
 * Needed for the v1 availability and booking endpoints.
 */
async function getEventTypeInfo(): Promise<{ id: number; duration: number } | null> {
  const apiKey = getApiKey();
  const { eventSlug } = parseBookingUrl();

  const res = await fetch(
    `${CAL_V1_BASE}/event-types?apiKey=${apiKey}`,
    { headers: { "Content-Type": "application/json" } },
  );

  if (!res.ok) {
    const body = await res.text();
    console.error(`[CAL.COM] Failed to fetch event types: ${res.status}`, body);
    return null;
  }

  const json = await res.json();
  const eventTypes = json.event_types || [];

  // Find the one matching our slug
  const match = eventTypes.find(
    (et: { slug: string }) => et.slug === eventSlug,
  );

  if (match) {
    console.log(`[CAL.COM] Found event type: id=${match.id}, slug=${match.slug}, duration=${match.length}min`);
    return { id: match.id, duration: match.length || 15 };
  }

  // Fallback: return the first event type
  if (eventTypes.length > 0) {
    console.log(`[CAL.COM] Slug "${eventSlug}" not found. Using first event type: id=${eventTypes[0].id}, duration=${eventTypes[0].length}min`);
    return { id: eventTypes[0].id, duration: eventTypes[0].length || 15 };
  }

  return null;
}

/**
 * Fetch available time slots for a given date.
 * Uses the v1 /availability endpoint which works with personal API keys.
 */
export async function getAvailableSlots(
  date: string, // YYYY-MM-DD
): Promise<Record<string, Array<{ display: string; utc: string }>>> {
  const apiKey = getApiKey();
  const { username } = parseBookingUrl();

  // Get the event type ID first
  const eventInfo = await getEventTypeInfo();
  if (!eventInfo) {
    throw new Error("Could not find Cal.com event type");
  }
  const eventTypeId = eventInfo.id;

  // Cal.com v1 availability endpoint
  const startTime = `${date}T00:00:00Z`;
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  const endTime = `${nextDay.toISOString().split("T")[0]}T23:59:59Z`;

  const params = new URLSearchParams({
    apiKey,
    eventTypeId: String(eventTypeId),
    username,
    startTime,
    endTime,
  });

  const url = `${CAL_V1_BASE}/slots?${params.toString()}`;
  console.log(`[CAL.COM] Fetching slots (v1): eventTypeId=${eventTypeId}, date=${date}`);

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[CAL.COM] v1 slots failed: ${res.status}`, body);
    throw new Error(`Cal.com slots API error: ${res.status}`);
  }

  const json = await res.json();
  console.log(`[CAL.COM] Slots response:`, JSON.stringify(json).slice(0, 500));

  // v1 returns: { slots: { "YYYY-MM-DD": [ { time: "2024-08-13T09:00:00.000Z" } ] } }
  const slotsData = json.slots || {};

  const result: Record<string, Array<{ display: string; utc: string }>> = {};
  for (const [day, times] of Object.entries(slotsData)) {
    result[day] = (times as Array<{ time: string }>).map((t) => {
      const d = new Date(t.time);
      return {
        display: d.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
          timeZone: "Asia/Kolkata",
        }),
        utc: t.time, // Raw UTC timestamp for booking
      };
    });
  }

  return result;
}

/**
 * Create a booking on Cal.com using v1 API.
 * Returns the booking UID on success.
 */
export async function createBooking(
  startTime: string, // ISO 8601 timestamp e.g. "2024-08-13T09:00:00Z"
  attendeeName: string,
  attendeeEmail: string,
  timeZone: string = "Asia/Kolkata",
): Promise<{ uid: string; startTime: string; endTime: string }> {
  const apiKey = getApiKey();

  const eventInfo = await getEventTypeInfo();
  if (!eventInfo) {
    throw new Error("Could not find Cal.com event type for booking");
  }
  const { id: eventTypeId, duration } = eventInfo;

  const url = `${CAL_V1_BASE}/bookings?apiKey=${apiKey}`;

  // Calculate end time using the actual event type duration
  const startDate = new Date(startTime);
  const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
  const endTimeISO = endDate.toISOString();

  console.log(`[CAL.COM] Creating booking: eventTypeId=${eventTypeId}, duration=${duration}min, start=${startTime}, end=${endTimeISO}, tz=${timeZone}`);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventTypeId,
      start: startTime,
      end: endTimeISO,
      responses: {
        name: attendeeName,
        email: attendeeEmail,
        notes: "Booked via StudyBuddyAI AI voice agent",
      },
      timeZone,
      language: "en",
      metadata: {
        source: "studybuddyai-ai-agent",
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[CAL.COM] Booking failed: ${res.status}`, body);
    throw new Error(`Cal.com booking API error: ${res.status} — ${body}`);
  }

  const json = await res.json();
  console.log(`[CAL.COM] Booking response:`, JSON.stringify(json).slice(0, 500));

  // v1 returns the booking directly
  const booking = json;

  return {
    uid: booking.uid || booking.id,
    startTime: booking.startTime || booking.start,
    endTime: booking.endTime || booking.end,
  };
}
