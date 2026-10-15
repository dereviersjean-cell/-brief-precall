"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import type { CalendarEvent } from "./calendar-event";

// Les deux fenêtres modales de la page Brief, dans leur propre fichier chargé
// à la demande (next/dynamic depuis BriefToolClient). Elles sont les seules à
// utiliser motion/react sur /brief : les sortir du chargement initial retire
// ~40 Ko gzip de JavaScript à la première page de l'app (palier 3 du plan
// performance, 15/10/2026).

function CompanyModal({
  event,
  defaultCompany,
  onConfirm,
  onClose,
}: {
  event: CalendarEvent;
  defaultCompany: string;
  onConfirm: (eventId: string, company: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(defaultCompany || event.summary);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-md)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <h2 className="mb-1 text-[17px] font-semibold tracking-[-0.01em] text-slate-900">Nom de l&apos;entreprise ?</h2>
        <p className="mb-4 text-[13.5px] leading-relaxed text-slate-500">
          Précisez le nom pour générer un brief précis.
        </p>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          placeholder="ex. Salesforce, HubSpot…"
          className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)] mb-4"
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) onConfirm(event.id, value.trim());
            if (e.key === "Escape") onClose();
          }}
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-border bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors duration-200"
          >
            Annuler
          </button>
          <button
            onClick={() => value.trim() && onConfirm(event.id, value.trim())}
            disabled={!value.trim()}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-[color:var(--primary)] px-4 text-[13px] font-medium text-white hover:brightness-110 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Générer le brief
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Formulaire pour un RDV absent de l'agenda synchronisé — sert uniquement à
// préparer un brief (voir le commentaire de CalendarEvent.manual). Le nom
// d'entreprise est demandé directement ici, jamais deviné après coup depuis
// un domaine email : contrairement à un événement de calendrier réel, un RDV
// manuel n'a pas toujours de contact renseigné.
function AddMeetingModal({
  onCreated,
  onClose,
}: {
  onCreated: (event: CalendarEvent) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  // Le nom du contact conditionne toute la fiche : l'annuaire retrouve
  // rarement quelqu'un sur sa seule adresse, alors qu'un nom accompagné de
  // l'entreprise suffit. Sans ce champ, un RDV créé ici n'avait aucune chance
  // d'obtenir un poste ni un parcours.
  const [contactName, setContactName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("09:00");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim() !== "" && company.trim() !== "" && date !== "" && time !== "";

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    const meetingTime = new Date(`${date}T${time}`);
    if (Number.isNaN(meetingTime.getTime())) {
      setError("Date ou heure invalide.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar/manual-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          companyName: company.trim(),
          contactEmail: contactEmail.trim() || undefined,
          contactName: contactName.trim() || undefined,
          meetingTime: meetingTime.toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Erreur lors de la création du rendez-vous.");
        return;
      }
      onCreated((data as { event: CalendarEvent }).event);
    } catch {
      setError("Erreur lors de la création du rendez-vous.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-[var(--shadow-md)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <h2 className="mb-1 text-[17px] font-semibold tracking-[-0.01em] text-slate-900">Ajouter un rendez-vous</h2>
        <p className="mb-4 text-[13.5px] leading-relaxed text-slate-500">
          Pour un RDV absent de votre agenda synchronisé. Il ne sera pas enregistré automatiquement — seul un brief pourra être préparé.
        </p>

        <div className="space-y-3 mb-4">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">Nom du rendez-vous</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              placeholder="ex. Démo produit"
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">Entreprise</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="ex. Salesforce, HubSpot…"
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">
              Nom du contact (optionnel)
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="ex. Edmond Dantès"
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)]"
            />
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              Prénom + nom : c&apos;est ce qui permet de retrouver son poste et son parcours.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">Email du contact (optionnel)</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="prenom@entreprise.com"
              className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)]"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[12px] font-medium text-slate-600">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)]"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-[12px] font-medium text-slate-600">Heure</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[color:var(--violet)] focus:border-[color:var(--violet)]"
              />
            </div>
          </div>
        </div>

        {error && <p className="mb-3 text-[13px] text-rose-700">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-border bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors duration-200"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-[color:var(--primary)] px-4 text-[13px] font-medium text-white hover:brightness-110 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Ajout…" : "Ajouter"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function BriefModals({
  modalEvent,
  modalDefaultCompany,
  onConfirmCompany,
  onCloseCompany,
  showAddMeeting,
  onMeetingCreated,
  onCloseAddMeeting,
}: {
  modalEvent: CalendarEvent | null;
  modalDefaultCompany: string;
  onConfirmCompany: (eventId: string, company: string) => void;
  onCloseCompany: () => void;
  showAddMeeting: boolean;
  onMeetingCreated: (event: CalendarEvent) => void;
  onCloseAddMeeting: () => void;
}) {
  return (
    <AnimatePresence>
      {modalEvent && (
        <CompanyModal event={modalEvent} defaultCompany={modalDefaultCompany} onConfirm={onConfirmCompany} onClose={onCloseCompany} />
      )}
      {showAddMeeting && <AddMeetingModal onCreated={onMeetingCreated} onClose={onCloseAddMeeting} />}
    </AnimatePresence>
  );
}
