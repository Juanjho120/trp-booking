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
        "Private panel to manage reservations, payments, accommodations, and availability for Tu Refugio Perfecto.",
    },
    adminSignIn: {
      title: "Admin access | Tu Refugio Perfecto",
      description:
        "Private access for authorized Tu Refugio Perfecto administrators.",
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
        "These fields are processed by Tilopay SDK. Tu Refugio Perfecto does not store card number, CVV, or expiration date.",
      paymentMethod: "Payment method",
      paymentMethodCard: "Credit / Debit Card",
      cardNumber: "Card number",
      acceptedCards: "Accepted cards: Visa, Mastercard, and American Express",
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
    signIn: {
      badge: "Admin access",
      title: "Sign in to the private dashboard",
      description:
        "Continue with the authorized Google account to manage reservations, payments, accommodations, and availability.",
      continueWithGoogle: "Continue with Google",
      accessNote:
        "Access is limited to accounts included in the secure server-side admin allowlist.",
      backToPublicSite: "Back to public site",
    },
    feedback: {
      dismiss: "Dismiss notification",
    },
    navigation: {
      fallbackUserName: "Administrator",
      brandLabel: "Private administration",
      ariaLabel: "Admin navigation",
      openMenu: "Open admin menu",
      closeMenu: "Close admin menu",
      publicSite: "View public site",
      signOut: "Sign out",
      items: {
        dashboard: "Overview",
        reservations: "Reservations",
        payments: "Payments",
        calendar: "Calendar",
        accommodations: "Accommodations",
        catalogs: "Catalogs",
      },
    },
    statuses: {
      reservation: {
        PENDING_PAYMENT: "Pending payment",
        CONFIRMED: "Confirmed",
        CANCELLED: "Cancelled",
        REFUNDED: "Refunded",
        PARTIALLY_REFUNDED: "Partially refunded",
        EXPIRED: "Expired",
        BLOCKED: "Blocked",
      },
      payment: {
        PENDING: "Pending",
        APPROVED: "Approved",
        REJECTED: "Rejected",
        FAILED: "Failed",
        REFUNDED: "Refunded",
        PARTIALLY_REFUNDED: "Partially refunded",
      },
      paymentClientEvent: {
        TILOPAY_SDK_START_PAYMENT_FAILED: "SDK payment start failed",
        TILOPAY_SDK_START_PAYMENT_NON_SUCCESS: "SDK payment start was not successful",
      },
      emailNotification: {
        PENDING: "Pending",
        PROCESSING: "Processing",
        SENT: "Sent",
        FAILED: "Failed",
        SKIPPED: "Skipped",
      },
    },
    dashboard: {
      badge: "Daily operations",
      title: "Admin overview",
      description:
        "Review what needs attention and enter the relevant module without scrolling through an endless page.",
      sections: {
        summary: "Operational summary",
        upcomingArrivals: "Upcoming arrivals",
      },
      stats: {
        confirmed: {
          label: "Upcoming confirmed reservations",
          description: "Confirmed stays that have not ended yet.",
        },
        pending: {
          label: "Active pending reservations",
          description: "Holds that are still inside their payment window.",
        },
        paymentIssues: {
          label: "Payment issues",
          description: "Rejected or failed attempts available for review.",
        },
        manualBlocks: {
          label: "Active manual blocks",
          description: "Ranges closed directly from the admin calendar.",
        },
      },
      labels: {
        guests: "Guests",
      },
      actions: {
        review: "Review",
        viewAll: "View all",
      },
      upcomingArrivalsDescription:
        "The next five confirmed reservations ordered by check-in date.",
      empty: {
        upcomingArrivals: "There are no upcoming confirmed arrivals.",
      },
    },
    reservationsPage: {
      seoTitle: "Reservations | Admin | Tu Refugio Perfecto",
      badge: "Direct reservations",
      title: "Reservations",
      description:
        "Search and filter reservations without loading payments, events, and calendar settings on the same page.",
      labels: {
        search: "Search reservations",
        propertyFilter: "Accommodation",
        statusFilter: "Status",
        results: "Results",
        page: "Page",
        of: "of",
        dates: "Dates",
        contact: "Contact",
        total: "Total",
        guests: "Guests",
        reservation: "Reservation",
        latestPayment: "Latest payment",
        unavailable: "Unavailable",
      },
      placeholders: {
        search: "Search by guest, email, or reservation ID",
      },
      filters: {
        allProperties: "All accommodations",
        allStatuses: "All statuses",
      },
      actions: {
        search: "Search",
        clear: "Clear",
        previous: "Previous",
        next: "Next",
      },
      notifications: {
        title: "Email delivery",
        description:
          "Transactional notification history for this reservation. Sent means Resend accepted the message; it does not confirm that it was opened.",
        labels: {
          type: "Type",
          recipient: "Intended recipient",
          locale: "Language",
          origin: "Origin",
          requestedBy: "Requested by",
          requestedAt: "Manual request",
          parentNotification: "Original notification",
          createdAt: "Created",
          status: "Status",
          attempts: "Attempts",
          lastAttempt: "Last attempt",
          nextAttempt: "Next attempt",
          scheduledFor: "Scheduled for",
          sentAt: "Sent",
          providerMessageId: "Provider ID",
          errorCode: "Error code",
          errorMessage: "Safe detail",
        },
        types: {
          RESERVATION_CONFIRMED: "Reservation confirmation",
          PAYMENT_APPROVED: "Payment approved",
          PAYMENT_FAILED: "Payment failed",
          RESERVATION_CANCELLED: "Reservation cancelled",
          RESERVATION_DATES_UPDATED: "Reservation dates updated",
          STAY_EXTENSION_CONFIRMED: "Stay extension confirmed",
          REFUND_PROCESSED: "Refund processed",
          ARRIVAL_INSTRUCTIONS: "Arrival instructions",
          ADMIN_NEW_RESERVATION: "New reservation for administration",
        },
        locales: {
          es: "Spanish",
          en: "English",
        },
        origins: {
          AUTOMATIC: "Automatic",
          MANUAL: "Manual",
        },
        actions: {
          retryNow: "Retry now",
          sendAgain: "Send again",
          sending: "Sending...",
          cancel: "Cancel",
        },
        dialog: {
          retryTitle: "Retry delivery",
          sendAgainTitle: "Send again",
          retryDescription:
            "A new notification will be created with its own delivery history and attempts.",
          sendAgainDescription:
            "A new copy will be created for a notification that the provider previously accepted.",
          recipientLabel: "Intended recipient",
          historyNote:
            "The original notification keeps its delivery status and history, and the new request is linked for audit purposes.",
          automaticSuppressionNote:
            "After the new request is created, the original notification is no longer eligible for automatic processing, preventing duplicate deliveries.",
          duplicateWarning:
            "The recipient may receive a duplicate email. Confirm this action only when it is necessary.",
        },
        success: {
          sent: "The new notification was accepted by the provider.",
          queued:
            "The new notification is pending and will be processed when email delivery is available.",
          alreadyProcessed:
            "This request already existed, so another notification was not created.",
          failedRetryScheduled:
            "The new notification failed, but an automatic retry was scheduled.",
          failedTerminal:
            "The new notification was created, but delivery failed without an automatic retry scheduled.",
        },
        errors: {
          ADMIN_UNAUTHORIZED: "Your session is not authorized for administration.",
          INVALID_ADMIN_EMAIL_NOTIFICATION_RESEND_REQUEST:
            "The resend request is invalid. Refresh the page and try again.",
          ADMIN_EMAIL_NOTIFICATION_NOT_FOUND:
            "The selected notification was not found for this reservation.",
          ADMIN_EMAIL_NOTIFICATION_STALE:
            "The notification changed after you opened this page. Refresh before trying again.",
          ADMIN_EMAIL_NOTIFICATION_PROCESSING_ACTIVE:
            "The notification is being processed. Wait for it to finish or for the worker to recover an expired claim.",
          ADMIN_EMAIL_NOTIFICATION_RESEND_NOT_ALLOWED:
            "This notification does not support manual resend.",
          ADMIN_EMAIL_NOTIFICATION_RESERVATION_NOT_CONFIRMED:
            "Only emails linked to a confirmed reservation can be resent.",
          ADMIN_EMAIL_NOTIFICATION_UNEXPECTED_ERROR:
            "The new notification could not be created. Try again.",
        },
        empty: "This reservation does not have email notifications yet.",
      },
      empty: {
        noResults: "No reservations match these filters.",
      },
    },
    paymentsPage: {
      seoTitle: "Payments | Admin | Tu Refugio Perfecto",
      badge: "Tilopay",
      title: "Payments and diagnostics",
      description:
        "Review payments or safe SDK events in separate views with search, filters, and pagination.",
      tabs: {
        payments: "Payments",
        events: "SDK events",
      },
      labels: {
        search: "Search payments",
        propertyFilter: "Accommodation",
        statusFilter: "Status",
        results: "Results",
        page: "Page",
        of: "of",
        amount: "Amount",
        order: "Order",
        reservation: "Reservation",
        payment: "Payment",
        createdAt: "Created",
        safeDiagnostics: "Safe diagnostics",
        environment: "Environment",
        sdkMessage: "SDK message",
        unavailable: "Unavailable",
      },
      placeholders: {
        payments: "Search by order, transaction, reservation, or guest",
        events: "Search by payment, reservation, guest, or SDK message",
      },
      filters: {
        allProperties: "All accommodations",
        allStatuses: "All statuses",
      },
      actions: {
        search: "Search",
        clear: "Clear",
        previous: "Previous",
        next: "Next",
      },
      diagnostics: {
        providerCode: "Provider code",
        providerMessage: "Provider message",
        authorization: "Authorization",
        providerOrder: "Provider order",
        tilopayTransaction: "Tilopay transaction",
        orderHashStatus: "OrderHash validation",
      },
      empty: {
        noPayments: "No payments match these filters.",
        noEvents: "No SDK events match these filters.",
      },
    },
    catalogs: {
      seoTitle: "Catalogs | Admin | Tu Refugio Perfecto",
      badge: "Shared content",
      title: "Catalogs",
      description:
        "Manage shared bilingual amenity and house-rule content in a section separate from accommodations.",
      tabs: {
        amenities: "Amenities",
        houseRules: "House rules",
      },
      sections: {
        amenities: "Amenity catalog",
        houseRules: "House-rule catalog",
      },
      labels: {
        nameEs: "Spanish name",
        nameEn: "English name",
        icon: "Icon",
        category: "Category",
        noCategory: "No category",
        titleEs: "Spanish title",
        titleEn: "English title",
        descriptionEs: "Spanish description",
        descriptionEn: "English description",
      },
      actions: {
        saveAmenity: "Save amenity",
        saveHouseRule: "Save rule",
        saving: "Saving...",
      },
      notes: {
        amenities:
          "The catalog is shared by all three accommodations. Editing an amenity name or icon updates every accommodation where it is assigned. Keys and categories remain fixed.",
        houseRules:
          "Editing a rule updates every accommodation where it is assigned. The public page displays the description for the selected language.",
      },
      success: {
        amenitySaved: "The amenity was updated successfully.",
        houseRuleSaved: "The rule was updated successfully.",
      },
      categoryLabels: {
        access: "Access",
        spaces: "Spaces",
        kitchen: "Kitchen",
        "guest-fit": "Guest fit",
        connectivity: "Connectivity",
        parking: "Parking",
        bathroom: "Bathroom",
        bedroom: "Bedroom",
        comfort: "Comfort",
        safety: "Safety",
        outdoor: "Outdoor",
        "guest-services": "Guest services",
        capacity: "Capacity",
        "house-rules": "House rules",
        care: "Property care",
        composed: "Combined accommodation",
      },
      iconLabels: {
        bath: "Bathroom",
        bed: "Bed",
        briefcase: "Luggage",
        car: "Car",
        chefHat: "Kitchen",
        coffee: "Coffee",
        dumbbell: "Exercise",
        fan: "Fan",
        flame: "Stove",
        home: "Accommodation",
        refrigerator: "Refrigerator",
        showerHead: "Shower",
        treePalm: "Patio",
        utensils: "Dining",
        shieldCheck: "Safety",
        wifi: "WiFi",
        users: "Guests",
      },
      errors: {
        ADMIN_UNAUTHORIZED: "Your session does not have admin access.",
        INVALID_ADMIN_CATALOG_REQUEST:
          "Review the catalog information and try again.",
        ADMIN_CATALOG_AMENITY_NOT_FOUND:
          "We could not find the selected amenity.",
        ADMIN_CATALOG_HOUSE_RULE_NOT_FOUND:
          "We could not find the selected rule.",
        ADMIN_CATALOG_STALE:
          "The catalog changed after you opened this page. Reload before saving again.",
        ADMIN_CATALOG_UNEXPECTED_ERROR:
          "We could not update the catalog. Please try again.",
      },
    },
    accommodations: {
      seoTitle: "Accommodations | Admin | Tu Refugio Perfecto",
      badge: "Content and settings",
      title: "Accommodations",
      description:
        "Manage bilingual public content, photos, assignments, and automatic preparation settings without mixing in prices or reservations.",
      overview: {
        sectionTitle: "Public content",
        sectionDescription:
          "Edit names, descriptions, capacity, and arrival times displayed on the public website.",
        labels: {
          capacity: "Capacity",
          bedrooms: "Bedrooms",
          price: "Reference price",
          checkIn: "Check-in",
          lastUpdated: "Last updated",
        },
        statuses: {
          DRAFT: "Draft",
          ACTIVE: "Active",
          INACTIVE: "Inactive",
        },
        actions: {
          editContent: "Edit public content",
          managePhotos: "Manage photos",
          manageAmenitiesRules: "Assign amenities and rules",
          manageArrivalInstructions: "Configure arrival instructions",
        },
        notes: {
          readonlyBoundaries:
            "Slug, status, price, currency, and composition are shown for reference and are not editable in this subphase.",
        },
      },
      content: {
        seoTitle: "Edit accommodation | Admin | Tu Refugio Perfecto",
        badge: "Bilingual public content",
        title: "Edit content",
        description:
          "Approved changes are reflected in the public listing, accommodation detail page, and dynamic metadata.",
        sections: {
          identity: "Identity",
          descriptions: "Descriptions",
          capacity: "Capacity",
          arrival: "Arrival and departure times",
        },
        labels: {
          nameEs: "Spanish name",
          nameEn: "English name",
          slug: "Public slug",
          shortDescriptionEs: "Short description in Spanish",
          shortDescriptionEn: "Short description in English",
          longDescriptionEs: "Long description in Spanish",
          longDescriptionEn: "Long description in English",
          maxGuests: "Maximum guests",
          bedrooms: "Bedrooms",
          bathrooms: "Bathrooms",
          checkInTime: "Check-in time",
          checkOutTime: "Optional check-out time",
        },
        placeholders: {
          selectCheckInTime: "Select check-in time",
          noCheckOutTime: "No check-out time defined",
        },
        actions: {
          backToAccommodations: "Back to accommodations",
          saveContent: "Save content",
          saving: "Saving...",
        },
        notes: {
          requiredLanguages:
            "Names and descriptions are required in both Spanish and English.",
          publicImpact:
            "The public website reads these fields directly from the database.",
          capacityRange: "Allowed values: whole numbers from 1 through 20.",
          timeFormat:
            "Select times in 30-minute intervals. Check-out can remain undefined.",
          immutableFields:
            "This editor does not change slug, price, currency, status, composition, photos, amenities, rules, or preparation settings. Photos are managed from their dedicated section.",
        },
        success: {
          contentSaved: "Accommodation content was saved successfully.",
        },
        errors: {
          ADMIN_UNAUTHORIZED: "Your session does not have admin access.",
          INVALID_ACCOMMODATION_CONTENT_REQUEST:
            "Review the content and complete every required field correctly.",
          ACCOMMODATION_CONTENT_PROPERTY_NOT_FOUND:
            "We could not find the requested accommodation.",
          ACCOMMODATION_CONTENT_STALE:
            "This accommodation changed after you opened the form. Reload the page before saving again.",
          ACCOMMODATION_CONTENT_UNEXPECTED_ERROR:
            "We could not save the accommodation content. Please try again.",
        },
      },
      arrivalInstructions: {
        seoTitle: "Arrival instructions | Admin | Tu Refugio Perfecto",
        badge: "Pre-check-in email",
        title: "Arrival instructions",
        description:
          "Configure the bilingual operational content and the time when the arrival email is scheduled for this accommodation.",
        sections: {
          content: "Guest content",
          schedule: "Scheduling",
        },
        labels: {
          exactAddress: "Exact address",
          mapUrl: "Optional HTTPS map link",
          instructionsEs: "Instructions in Spanish",
          instructionsEn: "Instructions in English",
          leadTimeHours: "Hours before check-in",
          propertyCheckIn: "Accommodation check-in time",
        },
        placeholders: {
          exactAddress: "Address shared only with the confirmed guest",
          mapUrl: "https://maps.google.com/...",
          instructionsEs:
            "Describe how to arrive, where to park, and who to contact.",
          instructionsEn:
            "Describe how to arrive, where to park, and who to contact.",
        },
        actions: {
          backToAccommodations: "Back to accommodations",
          enable: "Enable arrival email",
          disable: "Disable arrival email",
          save: "Save settings",
          saving: "Saving...",
        },
        states: {
          enabled: "Enabled",
          disabled: "Disabled",
        },
        notes: {
          contentOwnership:
            "This content is stored per accommodation in the database. It is sent only to guests with a confirmed reservation.",
          schedule:
            "The default is 48 hours. If a reservation is confirmed inside that window, the email becomes eligible immediately as long as check-in has not started.",
          securityTitle: "Do not store rotating secrets here",
          securityDescription:
            "Do not include door codes, lockbox codes, Wi-Fi passwords, or temporary credentials. Share them through a controlled operational channel when applicable.",
        },
        success: {
          saved:
            "Arrival settings were saved. Upcoming reservations will be scheduled without changing payment or confirmation state.",
        },
        errors: {
          ADMIN_UNAUTHORIZED: "Your session does not have administrator access.",
          INVALID_ADMIN_ARRIVAL_INSTRUCTIONS_REQUEST:
            "Review the address, both languages, map link, and lead-time range before saving.",
          ADMIN_ARRIVAL_INSTRUCTIONS_PROPERTY_NOT_FOUND:
            "We could not find the requested accommodation.",
          ADMIN_ARRIVAL_INSTRUCTIONS_STALE:
            "The settings changed after you opened this page. Reload before saving again.",
          ADMIN_ARRIVAL_INSTRUCTIONS_UNEXPECTED_ERROR:
            "We could not update the arrival instructions. Please try again.",
        },
      },
      photos: {
        seoTitle: "Accommodation photos | Admin | Tu Refugio Perfecto",
        badge: "Public gallery",
        title: "Manage photos",
        description:
          "Upload, order, and document the photos displayed in the public listing and accommodation gallery.",
        sections: {
          upload: "Upload a photo",
          current: "Current photos",
        },
        labels: {
          currentCount: "Photos",
          noFileSelected: "No file selected.",
          preview: "Preview",
          previewAlt: "Preview of the selected accommodation photo",
          altTextEs: "Alternative text in Spanish",
          altTextEn: "Alternative text in English",
          order: "Order",
          cover: "Cover",
        },
        actions: {
          backToAccommodations: "Back to accommodations",
          backToContent: "Edit content",
          chooseFile: "Choose file",
          upload: "Upload photo",
          uploading: "Uploading...",
          saveAltText: "Save text",
          moveUp: "Move up",
          moveDown: "Move down",
          setCover: "Use as cover",
          delete: "Delete",
          confirmDelete: "Delete photo",
          cancel: "Cancel",
          clearSelection: "Clear selection",
        },
        notes: {
          formats:
            "Allowed formats: JPG, PNG, and WEBP. Maximum size: 10 MB. Up to 40 active photos are allowed per accommodation.",
          altText:
            "Briefly describe what appears in the photo in both languages. This text improves accessibility and accompanies the public image.",
          order:
            "Use each card's controls to change the order. The cover is managed separately, and at least one active photo must always remain.",
          softDelete:
            "Deleting a photo hides it from the website and preserves the record for auditing. The Cloudinary asset remains until a restore or purge policy is approved.",
        },
        success: {
          photoUploaded: "The photo was uploaded successfully.",
          altTextSaved: "The alternative text was saved successfully.",
          orderSaved: "The photo order was updated successfully.",
          coverSaved: "The accommodation cover was updated successfully.",
          photoDeleted: "The photo was removed from the website successfully.",
        },
        empty: {
          noPhotos: "This accommodation does not have active photos yet.",
        },
        deleteDialog: {
          title: "Delete photo",
          description:
            "The photo will stop appearing on the public website. The record will remain for auditing, and this subphase will not delete the Cloudinary asset.",
        },
        errors: {
          ADMIN_UNAUTHORIZED: "Your session does not have admin access.",
          INVALID_PROPERTY_PHOTO_REQUEST:
            "Review the photo and complete the alternative text correctly in both languages.",
          PROPERTY_PHOTO_PROPERTY_NOT_FOUND:
            "We could not find the requested accommodation.",
          PROPERTY_PHOTO_NOT_FOUND:
            "We could not find the selected photo.",
          PROPERTY_PHOTO_STALE:
            "The gallery changed after you opened this page. Reload before trying again.",
          PROPERTY_PHOTO_LIMIT_REACHED:
            "This accommodation has reached the maximum of 40 active photos.",
          PROPERTY_PHOTO_MINIMUM_REQUIRED:
            "You cannot delete the accommodation's final active photo.",
          PROPERTY_PHOTO_UNSUPPORTED_TYPE:
            "Select an image in JPG, PNG, or WEBP format.",
          PROPERTY_PHOTO_FILE_TOO_LARGE:
            "The photo exceeds the maximum allowed size of 10 MB.",
          PROPERTY_PHOTO_UPLOAD_EXPIRED:
            "The upload took too long to finalize. Select the file and try again.",
          PROPERTY_PHOTO_PROVIDER_ERROR:
            "We could not complete the upload with the image provider. Please try again.",
          PROPERTY_PHOTO_UNEXPECTED_ERROR:
            "We could not update the accommodation photos. Please try again.",
        },
      },
      amenitiesRules: {
        seoTitle: "Assign amenities and rules | Admin | Tu Refugio Perfecto",
        badge: "Structured public content",
        title: "Assign amenities and rules",
        description:
          "Select which shared catalog amenities and house rules apply to this accommodation.",
        sections: {
          assignments: "Accommodation assignments",
          amenityAssignments: "Assigned amenities",
          houseRuleAssignments: "Assigned rules",
        },
        actions: {
          backToAccommodations: "Back to accommodations",
          openCatalogs: "Open catalogs",
          saveAssignments: "Save assignments",
          saving: "Saving...",
        },
        notes: {
          assignment:
            "Select which active items apply to this accommodation. Changes are reflected on the public page.",
          minimumRequired:
            "Each accommodation must keep at least one assigned amenity and one assigned rule.",
          catalogManagement:
            "Names, icons, and descriptions are edited from the Catalogs menu in the admin panel.",
        },
        success: {
          assignmentsSaved: "Assignments were saved successfully.",
        },
        errors: {
          ADMIN_UNAUTHORIZED: "Your session does not have admin access.",
          INVALID_AMENITY_HOUSE_RULE_REQUEST:
            "Review the amenity and rule assignments and try again.",
          AMENITY_HOUSE_RULE_PROPERTY_NOT_FOUND:
            "We could not find the requested accommodation.",
          AMENITY_NOT_FOUND: "We could not find the selected amenity.",
          HOUSE_RULE_NOT_FOUND: "We could not find the selected rule.",
          AMENITY_HOUSE_RULE_STALE:
            "Assignments changed after you opened this page. Reload before saving again.",
          AMENITY_HOUSE_RULE_MINIMUM_REQUIRED:
            "Select at least one amenity and one rule for the accommodation.",
          AMENITY_HOUSE_RULE_UNEXPECTED_ERROR:
            "We could not update the assignments. Please try again.",
        },
      },
      preparation: {
        badge: "Preparation settings",
        title: "Preparation buffers",
        description:
          "Manage each accommodation's automatic preparation policy without mixing it with reservations or daily blocks.",
        labels: {
          lastUpdated: "Last updated",
          daysBefore: "Days before check-in",
          daysAfter: "Days after check-out",
        },
        actions: {
          saveSettings: "Save settings",
          saving: "Saving...",
        },
        notes: {
          allowedRange: "Allowed values: 0 through 30 days.",
          settingsImpact:
            "Changes apply to confirmed reservations, active holds, public availability, and future iCal feeds. Individual unlocks are managed from Calendar.",
        },
        success: {
          settingsSaved: "Preparation settings were saved successfully.",
        },
        errors: {
          ADMIN_UNAUTHORIZED: "Your session does not have admin access.",
          INVALID_PREPARATION_BUFFER_REQUEST:
            "Review the preparation-day settings and try again.",
          PREPARATION_BUFFER_PROPERTY_NOT_FOUND:
            "We could not find the requested accommodation.",
          PREPARATION_BUFFER_RESERVATION_NOT_FOUND:
            "We could not find the selected reservation.",
          PREPARATION_BUFFER_RESERVATION_NOT_CONFIRMED:
            "Only buffers from confirmed reservations can be unlocked.",
          PREPARATION_BUFFER_DATE_IN_PAST:
            "A preparation day in the past cannot be changed.",
          PREPARATION_BUFFER_DATE_NOT_UNLOCKABLE:
            "This date is no longer part of the reservation's current buffer.",
          PREPARATION_BUFFER_OVERRIDE_NOT_FOUND:
            "We could not find the preparation unlock you want to restore.",
          PREPARATION_BUFFER_UNEXPECTED_ERROR:
            "We could not update preparation settings. Please try again.",
        },
      },
    },
    calendar: {
      seoTitle: "Calendar | Admin | Tu Refugio Perfecto",
      badge: "Operational availability",
      title: "Calendar by accommodation",
      description:
        "Review effective occupancy, block ranges manually, and release only sources that allow admin intervention.",
      weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      sources: {
        DIRECT_RESERVATION: "Direct reservation",
        PENDING_PAYMENT: "Pending payment",
        AIRBNB: "Airbnb",
        MANUAL_BLOCK: "Manual block",
        MAINTENANCE: "Maintenance",
        COMPOSED_LISTING_DEPENDENCY: "Combined dependency",
        PREPARATION_BUFFER: "Preparation",
        PREPARATION_BUFFER_OVERRIDE: "Preparation released",
      },
      legend: [
        { source: "DIRECT_RESERVATION" },
        { source: "PENDING_PAYMENT" },
        { source: "AIRBNB" },
        { source: "MANUAL_BLOCK" },
        { source: "PREPARATION_BUFFER" },
        { source: "PREPARATION_BUFFER_OVERRIDE" },
      ],
      labels: {
        search: "Search calendar",
        selectedRange: "Selected range",
        optionalNote: "Optional note",
        more: "more",
        inherited: "Inherited",
        guest: "Guest",
        reservation: "Reservation",
        note: "Note",
      },
      placeholders: {
        search: "Search by guest, reservation, or accommodation",
        optionalNote: "Add an internal note only when it is useful.",
      },
      actions: {
        blockDates: "Block dates",
        cancelSelection: "Cancel selection",
        confirmBlock: "Confirm block",
        previousMonth: "Previous month",
        nextMonth: "Next month",
        today: "Today",
        close: "Close",
        blockThisDay: "Block this day",
        releaseDay: "Release this day",
        unlockBuffer: "Release buffer",
        restoreBuffer: "Restore buffer",
      },
      states: {
        selectStart: "Select the first date in the calendar.",
        blocked: "This date has one or more blocking sources.",
        available: "This date is available for this accommodation.",
      },
      success: {
        datesBlocked: "The dates were blocked successfully.",
        dateReleased: "The manual block was removed from that day.",
        bufferUnlocked: "The preparation day was released successfully.",
        bufferRestored: "The preparation block was restored successfully.",
      },
      empty: {
        noBlocks: "This date has no blocks or admin overrides.",
      },
      errors: {
        ADMIN_UNAUTHORIZED: "Your session does not have admin access.",
        INVALID_ADMIN_CALENDAR_REQUEST:
          "Review the selected dates and try again.",
        ADMIN_CALENDAR_PROPERTY_NOT_FOUND:
          "We could not find the requested accommodation.",
        ADMIN_CALENDAR_DATE_IN_PAST:
          "Dates in the past cannot be changed.",
        ADMIN_CALENDAR_RANGE_UNAVAILABLE:
          "The selected range includes dates that are already occupied or blocked. Select available dates only.",
        ADMIN_CALENDAR_MANUAL_BLOCK_NOT_FOUND:
          "We could not find the selected manual block.",
        ADMIN_CALENDAR_DAY_NOT_IN_BLOCK:
          "This date is no longer part of the manual block.",
        ADMIN_CALENDAR_UNEXPECTED_ERROR:
          "We could not update the calendar. Please try again.",
        INVALID_PREPARATION_BUFFER_REQUEST:
          "We could not process the preparation-buffer change.",
        PREPARATION_BUFFER_PROPERTY_NOT_FOUND:
          "We could not find the requested accommodation.",
        PREPARATION_BUFFER_RESERVATION_NOT_FOUND:
          "We could not find the selected reservation.",
        PREPARATION_BUFFER_RESERVATION_NOT_CONFIRMED:
          "Only buffers from confirmed reservations can be released.",
        PREPARATION_BUFFER_DATE_IN_PAST:
          "A preparation day in the past cannot be changed.",
        PREPARATION_BUFFER_DATE_NOT_UNLOCKABLE:
          "This date is no longer part of the reservation's current buffer.",
        PREPARATION_BUFFER_OVERRIDE_NOT_FOUND:
          "We could not find the unlock you want to restore.",
        PREPARATION_BUFFER_UNEXPECTED_ERROR:
          "We could not update the preparation buffer. Please try again.",
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
      },
    },
  },
  emails: {
    common: {
      brandName: "Tu Refugio Perfecto",
      publicName: "Bungalows Tu Refugio Perfecto",
      location: "Panajachel, Guatemala",
      reservationReference: "Reservation reference",
      accommodation: "Accommodation",
      checkIn: "Check-in",
      checkOut: "Check-out",
      checkInTime: "Check-in time",
      exactAddress: "Exact address",
      nights: "Length of stay",
      guests: "Guests",
      arrivalTime: "Estimated arrival time",
      total: "Confirmed total",
      confirmedAt: "Confirmed at",
      guestName: "Primary guest",
      guestEmail: "Guest email",
      guestPhone: "Guest phone",
      guestCountry: "Guest country",
      preferredLanguage: "Preferred language",
      notProvided: "Not provided",
      spanish: "Spanish",
      english: "English",
      nightSingular: "night",
      nightPlural: "nights",
      guestSingular: "guest",
      guestPlural: "guests",
      supportLabel: "Reservation support",
      footer:
        "Tu Refugio Perfecto · Panajachel, Guatemala · Secure direct booking",
    },
    reservationConfirmed: {
      subjectPrefix: "Reservation confirmed",
      previewPrefix: "Your reservation is confirmed for",
      eyebrow: "Direct reservation confirmed",
      title: "Your reservation is confirmed",
      greetingPrefix: "Hello",
      introduction:
        "We received and validated your payment. Your stay is confirmed with the following details.",
      summaryTitle: "Reservation summary",
      paymentNote:
        "The payment was approved and the reservation is now confirmed. No additional action is required.",
      dateChangesTitle: "Date changes",
      dateChangesDescription:
        "Dates cannot be changed freely from the website. To request a change, reply to this email. The request requires prior authorization or, depending on the applicable policy, cancellation and a new reservation.",
      arrivalTitle: "Arrival instructions",
      arrivalDescription:
        "Detailed arrival instructions will be shared separately before your stay. This email does not include access codes.",
      supportDescription:
        "For assistance, reply to this email or contact us at",
      closing: "Thank you for booking directly with Tu Refugio Perfecto.",
    },
    arrivalInstructions: {
      subjectPrefix: "Arrival instructions",
      previewPrefix: "Information for your arrival on",
      eyebrow: "Your stay is approaching",
      title: "Instructions for your arrival",
      greetingPrefix: "Hello",
      introduction:
        "Your reservation is confirmed. Review this information before traveling to the accommodation.",
      scheduleTitle: "Arrival summary",
      locationTitle: "Location",
      mapActionLabel: "Open location in maps",
      mapActionFallback: "If the button does not work, open this link:",
      instructionsTitle: "Accommodation directions",
      securityNote:
        "For security, this email does not include rotating codes, passwords, or temporary credentials. The host will share them through the appropriate operational channel when applicable.",
      supportDescription:
        "For questions before arrival, reply to this email or contact us at",
      closing: "We look forward to welcoming you in Panajachel. Safe travels.",
    },
    adminNewReservation: {
      subjectPrefix: "New confirmed reservation",
      previewPrefix: "New confirmed reservation checking in on",
      eyebrow: "New direct reservation",
      title: "A new reservation was confirmed",
      introduction:
        "A direct reservation was confirmed after payment validation. Review the main operational details below.",
      reservationTitle: "Reservation details",
      guestTitle: "Guest details",
      paymentNote:
        "The payment flow already confirmed this reservation. It must not be confirmed manually.",
      actionLabel: "Open reservation details",
      actionFallback: "If the button does not work, open this link:",
      footer:
        "Administrative notification from Tu Refugio Perfecto. This email does not include card data or raw provider responses.",
    },
  },
} as const;
