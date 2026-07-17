"use client";

import ClientReferencesSection from "./ClientReferencesSection";

export default function ReferencesSettingsClient() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Références clients</h1>
        <p className="text-sm text-slate-500 mt-1">
          Vos cas clients passés — importés d&apos;un fichier ou d&apos;un CRM connecté — pour que Brief génère des
          briefs et analyses plus pertinents.
        </p>
      </div>

      <ClientReferencesSection />
    </div>
  );
}
