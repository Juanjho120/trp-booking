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
    admin: {
      title: "Admin | Tu Refugio Perfecto",
      description:
        "Minimal private panel to manage the TRP Booking authentication foundation.",
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
  reservations: {
    request: {
      title: "Request your direct reservation",
      description:
        "Enter your dates and main guest details to calculate a server-side quote. This phase does not create a reservation or start payment yet.",
      fields: {
        checkInDate: "Check-in date",
        checkOutDate: "Check-out date",
        guestCount: "Guests",
        guestName: "Full name",
        guestEmail: "Email address",
        guestPhone: "Phone",
        guestCountry: "Country",
        arrivalTimeEstimate: "Estimated arrival time",
      },
      placeholders: {
        date: "YYYY-MM-DD",
        guestName: "Your full name",
        guestEmail: "email@example.com",
        guestPhone: "+502 0000 0000",
        guestCountry: "Guatemala",
        arrivalTimeEstimate: "Example: 3:00 p.m.",
      },
      maxGuestsNote: "Maximum allowed capacity: {maxGuests} guest(s).",
      calculateQuote: "Calculate quote",
      loadingQuote: "Calculating quote...",
      genericQuoteError: "We could not calculate the quote. Review the details and try again.",
      quoteTitle: "Estimated quote",
      quoteRows: {
        nights: "Nights",
        nightlyRate: "Nightly rate",
        subtotal: "Subtotal",
        cleaningFee: "Cleaning fee",
        taxes: "Taxes",
        discounts: "Discounts",
        total: "Total",
      },
      nonBindingQuoteNote:
        "This quote is informational. Availability and totals will be recalculated on the server before creating the payment hold.",
      createHoldDisabled: "Create reservation hold in the next phase",
      phaseBoundaryNote:
        "Phase 8.3 only collects details and calculates a quote. It does not save reservations, block dates, or process payments.",
    },
  },
  admin: {
    shell: {
      brandLabel: "Private administration",
      badge: "Protected admin",
      title: "Minimal TRP Booking panel.",
      description:
        "This first shell confirms that private access is protected before adding operational tools for direct reservations.",
      fallbackUserName: "Administrator",
      viewPublicSite: "View public site",
      signOut: "Sign out",
      sessionCard: {
        title: "Admin session",
        signedInAs: "Signed in as",
        protectionNote:
          "Only emails authorized by the server-side allowlist can enter this space.",
      },
      modules: [
        {
          title: "Accommodations",
          description:
            "Future foundation to review accommodations, content, and public site configuration.",
          status: "Coming soon",
        },
        {
          title: "Direct reservations",
          description:
            "Reserved space to review direct reservations once the booking flow exists.",
          status: "Pending",
        },
        {
          title: "Payments and refunds",
          description:
            "Future area for operational tracking of validated payments and documented refunds.",
          status: "Pending",
        },
        {
          title: "Images",
          description:
            "Will be integrated when the Cloudinary phase is documented and implemented.",
          status: "Deferred",
        },
        {
          title: "Emails",
          description:
            "Will be added when the Resend phase is enabled for official notifications.",
          status: "Deferred",
        },
        {
          title: "iCal synchronization",
          description:
            "Remains out of this phase until the documented Airbnb iCal integration.",
          status: "Deferred",
        },
      ],
      guardrails: {
        title: "Phase limits",
        items: [
          "Does not manage reservations, payments, calendars, or images yet.",
          "Does not replace TAMIAS or add PMS features.",
          "Keeps public pages accessible without login.",
        ],
      },
    },
  },
  errors: {
    reservation: {
      unavailableDates: "The selected dates are no longer available.",
      invalidGuestCount: "The number of guests exceeds the allowed capacity.",
      expiredReservation: "The reservation expired before payment was completed.",
      invalidAccommodation: "The requested accommodation is not available for quoting.",
      invalidDateRange: "The quote dates are not valid.",
      invalidQuoteRequest: "We could not calculate a quote with the submitted information.",
    },
    payment: {
      failed:
        "We could not complete the payment. Please try again or contact us for help.",
      attempt: {
        INVALID_PAYMENT_HANDOFF_REQUEST:
          "We could not prepare the payment attempt. Please try again.",
        PENDING_HOLD_NOT_FOUND: "We could not find this pending reservation.",
        PENDING_HOLD_NOT_PAYABLE: "This reservation is no longer available for payment.",
        PENDING_HOLD_EXPIRED:
          "The payment window for this pending reservation expired. Create a new reservation.",
        PAYMENT_HANDOFF_UNAVAILABLE_DATES:
          "These dates are no longer available before payment. Create a new reservation with a different date range.",
        PAYMENT_HANDOFF_QUOTE_CHANGED:
          "The reservation total changed before payment. Please calculate the reservation again.",
        PAYMENT_HANDOFF_UNEXPECTED_ERROR:
          "We could not validate the reservation before payment. Please try again.",
        PAYMENT_ATTEMPT_AMOUNT_MISMATCH:
          "A pending payment attempt already exists and does not match the current total. Create a new reservation or contact the property.",
        PAYMENT_ATTEMPT_UNEXPECTED_ERROR:
          "We could not prepare the payment attempt. Please try again.",
      },
    },
  },
} as const;
