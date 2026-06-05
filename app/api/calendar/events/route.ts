import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface GCalAttendee {
  email: string;
  displayName?: string;
  self?: boolean;
}

interface GCalEvent {
  id: string;
  summary?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: GCalAttendee[];
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const now = new Date();
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const url = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events"
  );
  url.searchParams.set("timeMin", now.toISOString());
  url.searchParams.set("timeMax", in7days.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "50");

  const calRes = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });

  if (!calRes.ok) {
    const err = await calRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: (err as { error?: { message?: string } }).error?.message ?? "Erreur Google Calendar" },
      { status: calRes.status }
    );
  }

  const data = (await calRes.json()) as { items?: GCalEvent[] };
  const userEmail = session.user?.email ?? "";
  const userDomain = userEmail.split("@")[1] ?? "";

  function isExternal(email: string) {
    const domain = email.split("@")[1] ?? "";
    return domain !== userDomain;
  }

  const events = (data.items ?? [])
    .filter((event) => {
      const attendees = event.attendees ?? [];
      return attendees.some((a) => !a.self && isExternal(a.email));
    })
    .map((event) => ({
      id: event.id,
      summary: event.summary ?? "Sans titre",
      start: event.start,
      end: event.end,
      attendees: (event.attendees ?? [])
        .filter((a) => !a.self && isExternal(a.email))
        .map((a) => ({ name: a.displayName ?? a.email, email: a.email })),
    }));

  return NextResponse.json(events);
}
