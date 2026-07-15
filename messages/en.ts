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
    requestUx: {
      dateRange: {
        label: "Stay dates",
        buttonPlaceholder: "Select check-in and check-out",
        helper:
          "Select the check-in date and then the check-out date. Check-out is not counted as a reserved night.",
        clear: "Clear dates",
        done: "Done",
      },
      guests: {
        label: "Guests",
        placeholder: "Select guests",
      },
      country: {
        label: "Country",
        placeholder: "Select your country",
        search: "Search country...",
        noResults: "No matching country found.",
      },
      phone: {
        label: "Phone",
        localNumber: "Local number",
      },
      arrivalTime: {
        label: "Estimated arrival time",
        placeholder: "Select a time",
      },
      locale: {
        label: "Language",
      },
    },
    pendingHold: {
      createHold: "Create pending reservation",
      creatingHold: "Creating pending reservation...",
      successTitle: "Pending reservation created",
      reservationId: "Reservation",
      status: "Status",
      expiresAt: "Expires",
      total: "Total",
      pendingPayment: "Pending payment",
      paymentPendingNote:
        "Your reservation was temporarily held. Direct payment will be added in the next subphase; for now this hold expires automatically.",
      phaseBoundaryNote:
        "Subphase 8.4 creates a pending reservation for 15 minutes. It still does not confirm payment, send emails, or create manual calendar blocks.",
    },
  },
  payments: {
    tilopaySdk: {
      title: "Secure payment with Tilopay",
      description:
        "Complete payment inside this page using Tilopay's secure form. We do not store your card details.",
      preparePayment: "Prepare secure payment",
      preparingPayment: "Preparing secure payment...",
      initializingPayment: "Initializing Tilopay secure form...",
      cardSectionTitle: "Card details",
      secureFieldsNote:
        "These fields are processed by Tilopay SDK. TRP Booking does not store card number, CVV, or expiration date.",
      paymentMethod: "Payment method",
      paymentMethodCard: "Credit / Debit Card",
      cardNumber: "Card number",
      cardExpiration: "Expiration",
      cardCvv: "CVV",
      pay: "Pay reservation",
      processingPayment: "Processing payment...",
      paymentSubmitted:
        "The payment was sent to Tilopay. Wait for the secure form response before closing this page.",
      providerNote:
        "The reservation will only be confirmed after the payment result is validated on the server.",
      sessionError: "We could not prepare the payment form. Please try again.",
      sdkError: "We could not initialize the Tilopay secure form. Please try again.",
      paymentError: "We could not send the payment to Tilopay. Review the details and try again.",
    },
    retry: {
      page: {
        title: "Retry payment",
        description:
          "Your reservation is still pending payment. You can try completing the payment again while the hold is still active.",
        missingReservationTitle: "Reservation not found",
        missingReservationDescription:
          "This payment link does not include a valid reservation. Review the link or choose your accommodation again.",
        supportNote:
          "If the problem continues, contact us so we can help you complete your reservation.",
      },
      errors: {
        invalid_card_number: "Please enter a valid card number.",
        invalid_cvv: "The CVV is invalid. Review the security code and try again.",
        insufficient_funds:
          "The card has insufficient funds. Use another card or contact your bank.",
        card_not_allowed_sensitive:
          "This card cannot be used to complete the payment. Use another card or contact your bank.",
      },
    },
    result: {
      success: {
        title: "Payment completed",
        description:
          "Your payment was approved and the reservation was confirmed successfully.",
      },
      cancel: {
        title: "Payment not completed",
        description:
          "We could not complete the reservation payment. Review the information and try again.",
      },
      error: {
        title: "Payment verification error",
        description:
          "We could not verify the payment result. Please contact us before trying again.",
      },
      labels: {
        reservationId: "Reservation",
        paymentId: "Payment ID",
        paymentStatus: "Payment status",
        reservationStatus: "Reservation status",
        providerCode: "Provider code",
      },
      paymentStatuses: {
        PENDING: "Pending",
        APPROVED: "Approved",
        REJECTED: "Rejected",
        FAILED: "Failed",
        REFUNDED: "Refunded",
        PARTIALLY_REFUNDED: "Partially refunded",
      },
      reservationStatuses: {
        PENDING_PAYMENT: "Pending payment",
        CONFIRMED: "Confirmed",
        CANCELLED: "Cancelled",
        REFUNDED: "Refunded",
        PARTIALLY_REFUNDED: "Partially refunded",
        EXPIRED: "Expired",
        BLOCKED: "Blocked",
      },
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
      pendingHold: {
        INVALID_PENDING_HOLD_REQUEST: "Review the reservation details and try again.",
        INVALID_ACCOMMODATION: "We could not find this accommodation.",
        INVALID_DATE_RANGE: "Select a valid check-in and check-out date.",
        INVALID_GUEST_COUNT: "The guest count is not valid for this accommodation.",
        UNAVAILABLE_DATES: "These dates are no longer available. Select a different date range.",
        PENDING_HOLD_CONFLICT:
          "Someone else took these dates at the same time. Select a different date range.",
        PENDING_HOLD_UNEXPECTED_ERROR:
          "We could not create the pending reservation. Please try again.",
      },
      paymentHandoff: {
        INVALID_PAYMENT_HANDOFF_REQUEST:
          "We could not validate this pending reservation. Please try again.",
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
      },
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
      tilopaySdk: {
        INVALID_PAYMENT_HANDOFF_REQUEST:
          "We could not prepare the payment. Please try again.",
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
        TILOPAY_SDK_TOKEN_UNAVAILABLE:
          "We could not connect to Tilopay to prepare payment. Please try again.",
        TILOPAY_SDK_SESSION_UNEXPECTED_ERROR:
          "We could not prepare the payment form. Please try again.",
      }
    },
  },
} as const;
