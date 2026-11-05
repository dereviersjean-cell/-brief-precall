export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-6 sm:py-10">
      <div className="h-20 w-72 animate-pulse rounded-xl bg-white/70" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-48 animate-pulse rounded-2xl bg-white ring-1 ring-border" />
      ))}
    </div>
  );
}
