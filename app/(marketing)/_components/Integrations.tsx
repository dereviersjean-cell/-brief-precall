const INTEGRATIONS = [
  "Google Workspace",
  "Microsoft 365",
  "HubSpot",
  "Pipedrive",
  "Gmail",
  "Outlook",
  "Google Meet",
  "Microsoft Teams",
  "Zoom",
];

export function Integrations() {
  return (
    <section id="integrations" className="py-16 md:py-24 lg:py-32 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Fonctionne avec vos outils</h2>
        <p className="text-gray-600 text-lg mb-12">Brief s&apos;intègre à votre stack existante</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {INTEGRATIONS.map((name) => (
            <span
              key={name}
              className="bg-white border border-gray-200 rounded-xl px-5 py-3 text-sm font-medium text-gray-700 shadow-sm"
            >
              {name}
            </span>
          ))}
        </div>
        <p className="text-sm text-gray-400 mt-8">Sellsy et Salesforce prochainement</p>
      </div>
    </section>
  );
}
