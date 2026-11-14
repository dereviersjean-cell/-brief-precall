// L'heure du prochain rendez-vous d'un deal (décision D9, 13/11/2026) : le
// deal ne connaît que le jour convenu pendant le call ; l'heure se lit dans
// l'agenda du commercial, quand le rendez-vous y est. Sans dépendance, testé.

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Mots qui ne désignent aucun prospect.
const COMMON = new Set(["visio", "call", "point", "rendez", "vous", "reunion", "demo", "echange", "suivi", "avec", "pour", "meeting", "presentation", "decouverte"]);

function tokens(text: string | null | undefined, ignore: Set<string>): Set<string> {
  return new Set(
    fold(text ?? "")
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4 && !COMMON.has(w) && !ignore.has(w))
  );
}

export type DayMeeting = { title: string | null; startsAt: string; commercial: boolean };

// Le rendez-vous du jour qui est celui du deal : celui dont le titre partage
// un mot distinctif avec le nom du deal ou le titre du rendez-vous précédent ;
// à défaut, le seul rendez-vous commercial du jour. Dans le doute, null :
// mieux vaut un jour sans heure qu'une heure fausse.
export function pickDealMeeting(meetings: DayMeeting[], deal: { name: string; lastTitle: string | null; ownNames: string[] }): DayMeeting | null {
  const ignore = new Set(deal.ownNames.flatMap((n) => [...tokens(n, new Set())]));
  const wanted = new Set([...tokens(deal.name, ignore), ...tokens(deal.lastTitle, ignore)]);
  // Un nom de domaine en guise de nom de deal (« sebautomatisme.com ») se
  // retrouve collé dans un titre écrit en deux mots (« SEB' AUTOMATISME »).
  const squash = (text: string | null) => fold(text ?? "").replace(/[^a-z0-9]+/g, "");
  const stem = squash(deal.name.replace(/\.[a-z]{2,4}$/i, ""));
  const matches = meetings.filter((m) => [...tokens(m.title, ignore)].some((w) => wanted.has(w)) || (stem.length >= 6 && squash(m.title).includes(stem)));
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) return null;
  const commercial = meetings.filter((m) => m.commercial);
  return commercial.length === 1 ? commercial[0] : null;
}

// « 17 h » ou « 17 h 30 », à l'heure de Paris.
export function frenchTime(iso: string): string {
  const [h, m] = new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).split(":");
  return m === "00" ? `${Number(h)} h` : `${Number(h)} h ${m}`;
}
