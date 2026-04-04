import { NextRequest, NextResponse } from "next/server";
import {
  getAvailableSlots,
  createBooking,
  parseBookingUrl,
} from "@/lib/calcom";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/calcom?action=slots&date=YYYY-MM-DD
 *
 * Returns available consultation slots for a given date.
 * Called by the Python agent's `check_availability` tool.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const date = searchParams.get("date");

  if (action !== "slots" || !date) {
    return NextResponse.json(
      { error: "Required: ?action=slots&date=YYYY-MM-DD" },
      { status: 400 },
    );
  }

  try {
    const slots = await getAvailableSlots(date);
    const { username, eventSlug } = parseBookingUrl();
    return NextResponse.json({
      date,
      username,
      eventSlug,
      slots,
    });
  } catch (err) {
    console.error("[CALCOM API] Slots error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch slots" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/calcom
 * Body: { start_time, attendee_name, attendee_email, conversation_id?, timezone? }
 *
 * Books a consultation slot on Cal.com and optionally saves to Supabase.
 * Called by the Python agent's `book_consultation` tool.
 */
export async function POST(req: NextRequest) {
  let body: {
    start_time: string;
    attendee_name: string;
    attendee_email: string;
    conversation_id?: string;
    timezone?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { start_time, attendee_name, attendee_email, conversation_id, timezone } = body;

  if (!start_time || !attendee_name || !attendee_email) {
    return NextResponse.json(
      { error: "Required: start_time, attendee_name, attendee_email" },
      { status: 400 },
    );
  }

  try {
    const booking = await createBooking(
      start_time,
      attendee_name,
      attendee_email,
      timezone || "Asia/Kolkata",
    );

    console.log(
      `[CALCOM API] ✅ Booking created: uid=${booking.uid} for ${attendee_name} at ${booking.startTime}`,
    );

    // Optionally save to Supabase appointments table
    if (conversation_id) {
      try {
        await supabase.from("appointments").insert({
          conversation_id,
          cal_event_id: booking.uid,
          student_name: attendee_name,
          student_email: attendee_email,
          scheduled_at: booking.startTime,
          status: "scheduled",
        });
        console.log(`[CALCOM API] Appointment saved to Supabase`);
      } catch (dbErr) {
        console.error("[CALCOM API] Failed to save appointment to Supabase:", dbErr);
        // Don't fail the booking — the Cal.com booking already succeeded
      }
    }

    return NextResponse.json({
      success: true,
      booking: {
        uid: booking.uid,
        start_time: booking.startTime,
        end_time: booking.endTime,
      },
    });
  } catch (err) {
    console.error("[CALCOM API] Booking error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Booking failed" },
      { status: 500 },
    );
  }
}
