export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f3ed] px-6 py-20 text-[#1f2933]">
      <section className="mx-auto flex max-w-5xl flex-col gap-6">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#256d85]">
          TRP Booking
        </p>

        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
          Tu Refugio Perfecto
        </h1>

        <p className="max-w-2xl text-lg leading-8 text-[#4b5563]">
          Direct booking website for private accommodations in Panajachel,
          Guatemala, near Lake Atitlán.
        </p>

        <div className="rounded-2xl border border-[#e5ded3] bg-white/70 p-6 shadow-sm">
          <p className="text-sm text-[#4b5563]">
            Project setup is ready. The next phases will add the design system,
            accommodations, availability calendar, Airbnb iCal synchronization,
            payments, and admin area.
          </p>
        </div>
      </section>
    </main>
  );
}