export default function QuoteNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-white px-6 py-10 text-center">
        <p className="mb-1.5 text-[20px] font-semibold tracking-[-0.02em] text-slate-900">Devis introuvable</p>
        <p className="text-[13.5px] text-slate-500">Ce lien est invalide ou a expiré.</p>
      </div>
    </div>
  );
}
