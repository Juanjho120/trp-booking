import type { Metadata } from "next";

import { getAccommodationById } from "@/config/accommodations";
import { PublicAvailabilityCalendar, publicAvailabilityCopy } from "@/features/availability";
import type { AccommodationId } from "@/types/accommodation";

const copy = publicAvailabilityCopy.es;

const availabilityAccommodationIds: readonly AccommodationId[] = [
  "black-white-apartment",
  "perfect-retreat-bungalow",
  "complete-retreat",
];

export const metadata: Metadata = {
  title: copy.metadataTitle,
  description: copy.metadataDescription,
};

function getAvailabilityAccommodationCards() {
  return availabilityAccommodationIds.map((accommodationId) => {
    const accommodation = getAccommodationById(accommodationId);

    if (!accommodation) {
      throw new Error(`Accommodation not found for ${accommodationId}.`);
    }

    return {
      id: accommodationId,
      name: accommodation.name.es,
      description: accommodation.shortDescription.es,
      price: accommodation.baseNightlyPriceUsd,
      maxGuests: accommodation.maxGuests,
    };
  });
}

export default function AvailabilityPage() {
  const accommodationCards = getAvailabilityAccommodationCards();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-12 lg:px-8">
      <section className="rounded-[2rem] bg-stone-950 px-6 py-10 text-white shadow-sm lg:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-stone-300">
          {copy.pageEyebrow}
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight lg:text-5xl">
          {copy.pageTitle}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-stone-300">
          {copy.pageDescription}
        </p>
      </section>

      <div className="grid gap-8">
        {accommodationCards.map((accommodation) => (
          <article key={accommodation.id} className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
            <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                {copy.pageEyebrow}
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-stone-950">{accommodation.name}</h2>
              <p className="mt-3 text-sm leading-6 text-stone-600">{accommodation.description}</p>
              <p className="mt-5 text-sm font-semibold text-stone-800">
                {copy.nightlyPricePrefix} ${accommodation.price} USD {copy.nightlyPriceSuffix}
              </p>
            </section>

            <PublicAvailabilityCalendar accommodationId={accommodation.id} copy={copy} />
          </article>
        ))}
      </div>
    </main>
  );
}
