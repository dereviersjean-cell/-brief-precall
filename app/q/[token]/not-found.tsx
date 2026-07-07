export default function QuoteNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <p className="text-2xl font-bold text-slate-900 mb-2">Devis introuvable</p>
        <p className="text-slate-500 text-sm">Ce lien est invalide ou a expiré.</p>
      </div>
    </div>
  );
}
