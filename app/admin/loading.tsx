export default function AdminLoading() {
  return (
    <div aria-hidden="true" className="animate-pulse space-y-6">
      <div className="space-y-3">
        <div className="h-6 w-36 rounded-full bg-muted" />
        <div className="h-10 w-full max-w-xl rounded-2xl bg-muted" />
        <div className="h-5 w-full max-w-3xl rounded-xl bg-muted" />
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            className="h-40 rounded-3xl border border-border bg-muted/60"
            key={index}
          />
        ))}
      </div>
    </div>
  );
}
