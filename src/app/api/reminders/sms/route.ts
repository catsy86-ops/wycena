import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

/**
 * POST /api/reminders/sms
 * Wysyła SMS reminder (mock implementation)
 * W produkcji: użyć Twilio, AWS SNS, itp.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, title, clientName, clientPhone, startTime, minutesBefore } = body;

    // Walidacja
    if (!title || !clientName || !clientPhone || !startTime) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Walidacja numeru telefonu
    const phoneRegex = /^[\+]?[\d\s\-]{7,15}$/;
    if (!phoneRegex.test(clientPhone)) {
      return NextResponse.json(
        { error: "Invalid phone number" },
        { status: 400 }
      );
    }

    // Mock: Logowanie zamiast wysyłania
    console.log(`[SMS REMINDER] Event: ${title}, Client: ${clientName}, Phone: ${clientPhone}, Time: ${startTime}, Minutes before: ${minutesBefore}`);

    // W produkcji tutaj byłby kod wysyłania SMS
    // Przykład z Twilio:
    /*
    const twilio = require("twilio");
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    const eventTime = new Date(startTime);
    const formattedTime = format(eventTime, "HH:mm", { locale: pl });

    const message = await client.messages.create({
      body: `Przypomnienie WYCENKA: ${title} o ${formattedTime} u ${clientName}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: clientPhone,
    });

    return NextResponse.json(
      { success: true, messageId: message.sid },
      { status: 200 }
    );
    */

    return NextResponse.json(
      { success: true, message: "SMS reminder sent (mock)" },
      { status: 200 }
    );
  } catch (error) {
    console.error("SMS reminder error:", error);
    return NextResponse.json(
      { error: "Failed to send SMS reminder" },
      { status: 500 }
    );
  }
}
