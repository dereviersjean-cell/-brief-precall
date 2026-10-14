import { CalendarDays, Mail } from "lucide-react";
import { SALES_CONTACT } from "@/lib/sales-contact";

// Encart « aller plus loin » des inscriptions libres (accès « briefs ») :
// prendre un créneau dans l'agenda de Hubert, ou lui écrire. Deux tailles —
// `compact` pour la barre latérale, `banner` en tête de page et quand la
// limite du jour est atteinte.
export default function TalkToSales({
  variant,
  title,
  description,
}: {
  variant: "compact" | "banner";
  title?: string;
  description?: string;
}) {
  const { firstName, email, bookingUrl } = SALES_CONTACT;
  const heading = title ?? "Aller plus loin avec Brief";
  const text =
    description ??
    `Enregistrement et analyse de vos rendez-vous, emails de suivi, coaching de l'équipe : ${firstName} vous montre tout en 30 minutes.`;

  if (variant === "compact") {
    return (
      <div className="rounded-xl bg-[color:var(--lavender)] p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[color:var(--violet)]">{heading}</p>
        <p className="mt-1 text-[11px] leading-snug text-slate-600">Échangez avec {firstName}, de l&apos;équipe Brief.</p>
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center justify-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11.5px] font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:ring-slate-300"
        >
          <CalendarDays className="h-3 w-3" />
          Prendre rendez-vous
        </a>
        <a
          href={`mailto:${email}`}
          className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-[color:var(--violet)] hover:underline"
        >
          <Mail className="h-3 w-3" />
          Écrire à {firstName}
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[color:var(--lavender)] p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[color:var(--violet)]">{heading}</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-slate-600">{text}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[color:var(--primary)] px-4 text-[13px] font-medium text-white transition hover:brightness-110"
        >
          <CalendarDays className="h-4 w-4" />
          Prendre rendez-vous avec {firstName}
        </a>
        <a
          href={`mailto:${email}`}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[color:var(--violet)] hover:underline"
        >
          <Mail className="h-4 w-4" />
          Lui écrire
        </a>
      </div>
    </div>
  );
}
