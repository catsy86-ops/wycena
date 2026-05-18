import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

/**
 * POST /api/reminders/email
 * Wysyła email reminder (mock implementation)
 * W produkcji: użyć SendGrid, Mailgun, AWS SES, itp.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, title, clientName, clientEmail, startTime, minutesBefore, address } = body;

    // Walidacja
    if (!title || !clientName || !startTime) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Mock: Logowanie zamiast wysyłania
    console.log(`[EMAIL REMINDER] Event: ${title}, Client: ${clientName}, Time: ${startTime}, Minutes before: ${minutesBefore}`);

    // W produkcji tutaj byłby kod wysyłania emaila
    // Przykład z SendGrid:
    /*
    const sgMail = require("@sendgrid/mail");
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const eventTime = new Date(startTime);
    const formattedTime = format(eventTime, "dd.MM.yyyy HH:mm", { locale: pl });

    const msg = {
      to: clientEmail,
      from: process.env.SENDER_EMAIL || "noreply@wycenka.pl",
      subject: `Przypomnienie: ${title}`,
      html: `
        <h2>Przypomnienie o zdarzeniu</h2>
        <p>Cześć ${clientName},</p>
        <p>Przypominamy o zaplanowanym zdarzeniu:</p>
        <ul>
          <li><strong>Tytuł:</strong> ${title}</li>
          <li><strong>Data i godzina:</strong> ${formattedTime}</li>
          ${address ? `<li><strong>Lokalizacja:</strong> ${address}</li>` : ""}
        </ul>
        <p>Przypomnienie wysłane ${minutesBefore} minut przed zdarzeniem.</p>
      `,
    };

    await sgMail.send(msg);
    */

    return NextResponse.json(
      { success: true, message: "Email reminder sent (mock)" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Email reminder error:", error);
    return NextResponse.json(
      { error: "Failed to send email reminder" },
      { status: 500 }
    );
  }
}
