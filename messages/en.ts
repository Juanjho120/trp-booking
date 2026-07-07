export const enMessages = {
  common: {
    brandName: "Tu Refugio Perfecto",
    publicName: "Bungalows Tu Refugio Perfecto",
    bookNow: "Book now",
    reserve: "Book",
    viewAccommodations: "View accommodations",
    viewDetails: "View details",
    exploreAccommodations: "Explore accommodations",
    whyBookDirect: "Why book direct",
  },
  navigation: {
    mainAriaLabel: "Main navigation",
    homeAriaLabel: "Go to homepage",
    locationLabel: "Panajachel, Guatemala",
    items: [
      { label: "Accommodations", href: "#alojamientos" },
      { label: "Benefits", href: "#beneficios" },
      { label: "Location", href: "#ubicacion" },
      { label: "Contact", href: "#contacto" },
    ],
  },
  footer: {
    description:
      "Direct reservations for private accommodations in Panajachel, near Lake Atitlán.",
    navigationTitle: "Navigation",
    contactTitle: "Contact",
    rights: "All rights reserved.",
    poweredBy: "Direct booking website powered by",
  },
  home: {
    hero: {
      badge: "Panajachel · Lake Atitlán",
      title: "Your private retreat in Panajachel.",
      description:
        "Bungalows Tu Refugio Perfecto brings together comfortable, private, and well-located accommodations for direct booking near Lake Atitlán.",
      highlights: [
        "Secure direct bookings",
        "Private accommodations",
        "Near Lake Atitlán",
      ],
      bookingCard: {
        eyebrow: "Direct Booking",
        title: "Book direct, avoid intermediaries, and receive confirmation by email.",
        description:
          "Availability, secure payments with Tilopay, and Airbnb synchronization will be integrated in upcoming phases.",
      },
    },
    accommodations: {
      badge: "Accommodations",
      title: "Choose the right space for your stay.",
      description:
        "Book an independent accommodation or the complete retreat for more privacy and comfort as a group.",
      privateLabel: "Private",
      composedLabel: "Combined",
      upToGuestsPrefix: "Up to",
      guests: "guests",
      from: "From",
      perNight: "/ night",
      bedroomAbbr: "bed.",
      bathroomSingular: "bathroom",
      bathroomPlural: "bathrooms",
    },
    benefits: {
      badge: "Direct booking",
      title: "A clear, reliable, and simple experience.",
      description:
        "The website is designed so guests can review important information, check availability, and complete their reservation with confidence.",
      items: [
        {
          title: "Direct communication",
          description:
            "Talk directly with the host before and after booking without depending on intermediaries.",
        },
        {
          title: "Secure online payment",
          description:
            "The payment flow will be integrated with Tilopay, and the reservation will only be confirmed after an approved payment.",
        },
        {
          title: "Synchronized availability",
          description:
            "The calendar will synchronize with Airbnb to reduce the risk of double bookings.",
        },
      ],
    },
    location: {
      badge: "Location",
      title: "Panajachel, a comfortable base for experiencing Lake Atitlán.",
      description:
        "The accommodations are designed for guests who want privacy, a convenient location, and a peaceful stay near restaurants, shops, and lake access.",
      highlights: [
        "Near Calle Santander",
        "A few minutes from Lake Atitlán",
        "Ideal for resting or exploring Panajachel",
      ],
      mapTitle: "Arrival map and photos",
      mapDescription:
        "Detailed arrival instructions will be sent after payment is confirmed.",
    },
    trust: {
      badge: "Trust",
      title: "Clear information before payment.",
      description:
        "The public experience must help guests feel safe before completing a direct reservation.",
      items: [
        "49 five-star reviews on Airbnb",
        "Clear rules before booking",
        "Automatic email confirmation",
        "Check-in from 8:00 a.m.",
      ],
    },
    cta: {
      eyebrow: "Coming soon",
      title: "Book direct at Tu Refugio Perfecto.",
      description:
        "The next phase will add availability, secure payments, and calendar synchronization to complete direct bookings.",
    },
  },
  properties: {
    listing: {
      badge: "Accommodations",
      title: "Private spaces to rest in Panajachel.",
      description:
        "Explore each available option and choose between a private apartment, a family bungalow, or the complete retreat for small groups.",
      guests: "guests",
      bedroomAbbr: "bed.",
      night: "night",
      privateLabel: "Private",
      composedLabel: "Combined",
    },
    detail: {
      backToAccommodations: "← Back to accommodations",
      privateLabel: "Private accommodation",
      composedLabel: "Combined accommodation",
      reservationSummary: "Reservation summary",
      from: "From",
      perNight: "/ night",
      guests: "guests",
      bedroomAbbr: "bed.",
      bathroomSingular: "bathroom",
      bathroomPlural: "bathrooms",
      calendarComingSoon: "Calendar coming soon",
      availabilityLater: "Availability, booking, and payment will be connected in later phases.",
      mainAmenities: "Main amenities",
      rulesBadge: "Rules",
      beforeBooking: "Before booking",
      rulesDescription:
        "These rules help maintain a peaceful, safe, and comfortable environment for all guests.",
    },
  },
  errors: {
    reservation: {
      unavailableDates: "The selected dates are no longer available.",
      invalidGuestCount: "The number of guests exceeds the allowed capacity.",
      expiredReservation: "The reservation expired before payment was completed.",
      dateChangesRequireApproval:
        "Reservation date changes require prior administrator approval.",
    },
    payment: {
      failed:
        "We could not complete the payment. Please try again or contact us for help.",
      webhookNotConfirmed:
        "The reservation cannot be confirmed yet because the payment has not been validated.",
    },
    calendar: {
      syncFailed: "We could not synchronize the calendar right now. Please try again later.",
      preparationBufferConflict:
        "The selected dates are not available due to accommodation preparation time.",
    },
  },
} as const;
