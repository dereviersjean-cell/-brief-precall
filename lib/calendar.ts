export type CalendarEvent = {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees: Array<{ name?: string; email: string }>;
};

function isExternal(email: string, userDomain: string): boolean {
  const domain = email.split("@")[1] ?? "";
  return domain !== userDomain;
}

async function fetchGoogleCalendar(
  accessToken: string,
  userEmail: string
): Promise<CalendarEvent[]> {
  const now = new Date();
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", now.toISOString());
  url.searchParams.set("timeMax", in7days.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "50");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? "Erreur Google Calendar");
  }

  const data = await res.json() as {
    items?: Array<{
      id: string;
      summary?: string;
      start: { dateTime?: string; date?: string };
      end: { dateTime?: string; date?: string };
      attendees?: Array<{ email: string; displayName?: string; self?: boolean }>;
    }>;
  };

  const userDomain = userEmail.split("@")[1] ?? "";

  return (data.items ?? [])
    .filter((event) =>
      (event.attendees ?? []).some((a) => !a.self && isExternal(a.email, userDomain))
    )
    .map((event) => ({
      id: event.id,
      summary: event.summary ?? "Sans titre",
      start: event.start,
      end: event.end,
      attendees: (event.attendees ?? [])
        .filter((a) => !a.self && isExternal(a.email, userDomain))
        .map((a) => ({ name: a.displayName ?? a.email, email: a.email })),
    }));
}

async function fetchMicrosoftCalendar(
  accessToken: string,
  userEmail: string
): Promise<CalendarEvent[]> {
  const now = new Date();
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const url = new URL("https://graph.microsoft.com/v1.0/me/calendarView");
  url.searchParams.set("startDateTime", now.toISOString());
  url.searchParams.set("endDateTime", in7days.toISOString());
  url.searchParams.set("$select", "id,subject,start,end,attendees");
  url.searchParams.set("$orderby", "start/dateTime");
  url.searchParams.set("$top", "50");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.timezone="UTC"',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? "Erreur Microsoft Calendar");
  }

  const data = await res.json() as {
    value?: Array<{
      id: string;
      subject?: string;
      start: { dateTime: string; timeZone: string };
      end: { dateTime: string; timeZone: string };
      attendees?: Array<{
        emailAddress: { name?: string; address: string };
        type?: string;
      }>;
    }>;
  };

  const userDomain = userEmail.split("@")[1] ?? "";
  const lowerUserEmail = userEmail.toLowerCase();

  return (data.value ?? [])
    .filter((event) =>
      (event.attendees ?? []).some((a) => {
        const email = a.emailAddress.address.toLowerCase();
        return email !== lowerUserEmail && isExternal(email, userDomain);
      })
    )
    .map((event) => {
      // Microsoft returns dateTime without trailing Z when using outlook.timezone=UTC
      const toISO = (dt: string) => (dt.endsWith("Z") ? dt : `${dt}Z`);
      return {
        id: event.id,
        summary: event.subject ?? "Sans titre",
        start: { dateTime: toISO(event.start.dateTime) },
        end: { dateTime: toISO(event.end.dateTime) },
        attendees: (event.attendees ?? [])
          .filter((a) => {
            const email = a.emailAddress.address.toLowerCase();
            return email !== lowerUserEmail && isExternal(email, userDomain);
          })
          .map((a) => ({
            name: a.emailAddress.name ?? a.emailAddress.address,
            email: a.emailAddress.address,
          })),
      };
    });
}

export async function getUpcomingMeetings(
  accessToken: string,
  provider: string,
  userEmail: string
): Promise<CalendarEvent[]> {
  if (provider === "azure-ad") {
    return fetchMicrosoftCalendar(accessToken, userEmail);
  }
  return fetchGoogleCalendar(accessToken, userEmail);
}
