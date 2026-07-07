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
    from: "From",
    perNight: "per night",
    guests: "guests",
    upTo: "Up to",
    bedrooms: "bedrooms",
    bathrooms: "bathrooms",
  },
  seo: {
    home: {
      title: "Tu Refugio Perfecto | Private bungalows in Panajachel",
      description:
        "Book private accommodations directly in Panajachel, Guatemala, near Lake Atitlán.",
    },
    accommodations: {
      title: "Accommodations in Panajachel | Tu Refugio Perfecto",
      description:
        "Explore Black & White Apartment, Perfect Retreat Bungalow, and the Complete Private Retreat for direct booking in Panajachel.",
    },
    notFoundAccommodation: {
      title: "Accommodation not found | Tu Refugio Perfecto",
      description:
        "The requested accommodation is not available. Explore Tu Refugio Perfecto accommodation options in Panajachel.",
    },
  },

  navigation: {
    mainAriaLabel: "Main navigation",
    homeAriaLabel: "Go to homepage",
    locationLabel: "Panajachel, Guatemala",
    items: [
      { label: "Home", href: "/" },
      { label: "Accommodations", href: "/alojamientos" },
      { label: "Benefits", href: "/#beneficios" },
      { label: "Location", href: "/#ubicacion" },
      { label: "Contact", href: "#contacto" },
    ],
  },
  footer: {
    description:
      "Direct reservations for private accommodations in Panajachel, near Lake Atitlán.",
    navigationTitle: "Navigation",
    contactTitle: "Contact",
    reservationsEmailLabel: "Reservations",
    englishEmailLabel: "English support",
    adminEmailLabel: "Administration",
    rights: "All rights reserved.",
    poweredBy: "Direct booking website powered by",
    note:
      "Soon you will be able to check availability, book, and pay online from this website.",
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
          "Availability, secure Tilopay payments, and Airbnb synchronization will be added in upcoming phases.",
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
      perNight: "per night",
      bedroomAbbr: "bed.",
      bathroomSingular: "bathroom",
      bathroomPlural: "bathrooms",
    },
    benefits: {
      badge: "Direct booking",
      title: "A clear, trustworthy experience without unnecessary intermediaries.",
      description:
        "The website is designed so guests can learn about the accommodations, review important information, and book with direct host communication.",
      items: [
        {
          title: "Direct communication",
          description:
            "Ask questions about arrival, rules, and availability without spreading the conversation across several platforms.",
        },
        {
          title: "Transparent information",
          description:
            "Photos, amenities, rules, policies, and prices are shown before starting any booking flow.",
        },
        {
          title: "Email confirmation",
          description:
            "When booking is active, every confirmed reservation will send important details and arrival instructions.",
        },
      ],
    },
    location: {
      badge: "Location",
      title: "Near Calle Santander and Lake Atitlán.",
      description:
        "The accommodations are in Panajachel, in a practical area for resting, walking, visiting restaurants, and exploring the lake.",
      highlights: [
        "Panajachel, Guatemala",
        "Around 10 minutes walking to the lake",
        "Near restaurants and shops",
      ],
      mapTitle: "General location",
      mapDescription:
        "The exact address and detailed arrival instructions are shared after the reservation is confirmed.",
    },
    trust: {
      badge: "Trust",
      title: "Designed for confident booking.",
      description:
        "The site is being built with clear policies, real photos, official email addresses, and a secure payment flow for local and international guests.",
      items: [
        "Real photos of the accommodations",
        "Rules and policies visible before booking",
        "Official emails from the turefugioperfecto.com.gt domain",
        "Secure Tilopay payments in the booking phase",
      ],
    },
    cta: {
      badge: "Online booking coming soon",
      title: "Explore the accommodations before choosing your dates.",
      description:
        "The public foundation already presents the available spaces. Upcoming phases will add availability, direct booking, payments, and Airbnb synchronization.",
    },
  },
  properties: {
    listing: {
      badge: "Available accommodations",
      title: "Three ways to stay at Tu Refugio Perfecto.",
      description:
        "Book the apartment, the bungalow, or both accommodations together as Refugio Completo.",
    },
    detail: {
      backToAccommodations: "Back to accommodations",
      privateLabel: "Private accommodation",
      composedLabel: "Combined accommodation",
      priceTitle: "Summary",
      from: "From",
      perNight: "per night",
      maxGuests: "Maximum guests",
      bedrooms: "Bedrooms",
      bathrooms: "Bathrooms",
      checkIn: "Check-in",
      earlyCheckIn: "Earlier check-in",
      preparationBuffer: "Preparation buffer",
      preparationBufferDescription:
        "These days are automatically blocked before and after each reservation to prepare the accommodation. The admin may unlock them when operationally convenient.",
      preparationBufferBefore: "day(s) before",
      preparationBufferAfter: "day(s) after",
      reserveCta: "Book this accommodation",
      reserveComingSoon:
        "The availability calendar and online payment will be added in upcoming phases.",
      galleryTitle: "Gallery",
      highlightsTitle: "Highlights",
      amenitiesTitle: "Amenities",
      rulesTitle: "Important rules",
    },
  },
  errors: {
    reservation: {
      unavailableDates: "The selected dates are no longer available.",
      invalidGuestCount: "The number of guests exceeds the allowed capacity.",
      expiredReservation: "The reservation expired before payment was completed.",
    },
    payment: {
      failed:
        "We could not complete the payment. Please try again or contact us for help.",
    },
  },
} as const;
