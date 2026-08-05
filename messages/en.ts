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
      preparingPayment: "Preparing payment...",
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
      pay: "Pay securely",
      processingPayment: "Processing payment...",
      paymentSubmitted:
        "The payment was sent to Tilopay. Wait for the secure form response before closing this page.",
      providerNote:
        "The result is applied only after server-side payment validation. An approved adjustment does not change dates until its authorized transition is completed.",
      sessionError: "We could not prepare the payment form. Please try again.",
      sdkError: "We could not initialize the Tilopay secure form. Please try again.",
      paymentError: "We could not send the payment to Tilopay. Review the details and try again.",
    },
    lifecycleAdjustment: {
      title: "Pay the stay adjustment",
      description:
        "The administrator approved the requested dates. Complete only the displayed difference before the hold expires.",
      approvedTitle: "Adjustment payment approved",
      approvedDescription:
        "Tilopay approved the additional payment. The reservation remains confirmed with its original dates until the authorized update is completed by the system.",
      approvedNote:
        "You do not need to pay again. Final date application is processed safely and preserves the reservation history.",
      completedTitle: "Stay update completed",
      completedDescription:
        "The additional payment was validated and the requested dates have been applied to the confirmed reservation.",
      completedZeroDescription:
        "The requested dates have been applied to the confirmed reservation.",
      completedNegativeDescription:
        "The requested dates have been applied to the confirmed reservation. Refund confirmation will be sent separately after the process is completed.",
      completedNote:
        "The reservation keeps its identifier and history. No additional payment is required.",
      unavailableTitle: "Adjustment link unavailable",
      originalDates: "Current confirmed dates",
      requestedDates: "Requested dates",
      holdRemaining: "Hold time remaining",
      securityNote:
        "This private link is bound to this request and payment attempt and expires with the independent 60-minute hold.",
      requestTypes: {
        DATE_CHANGE: "Date change",
        STAY_EXTENSION: "Stay extension",
      },
      errors: {
        INVALID_LIFECYCLE_ADJUSTMENT_HANDOFF:
          "The link is invalid or was altered. Request a new link from the administrator.",
        LIFECYCLE_ADJUSTMENT_HANDOFF_EXPIRED:
          "The 60-minute hold expired. The original dates remain unchanged.",
        LIFECYCLE_ADJUSTMENT_NOT_PAYABLE:
          "This adjustment no longer accepts another payment. Check its status with the administrator.",
        LIFECYCLE_ADJUSTMENT_PAYMENT_MISMATCH:
          "The payment no longer matches the approved request. No new charge was made.",
      },
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
      cancellation: {
        badge: "Reservation lifecycle",
        title: "Administrative cancellation",
        description:
          "Record a request received through an authorized channel and decide the cancellation without mixing it with refund execution.",
        labels: {
          unavailable: "Unavailable",
          request: "Request",
          channel: "Request channel",
          requesterName: "Requester name",
          requesterEmail: "Optional contact email",
          requesterPhone: "Optional contact phone",
          requesterContact: "Requester contact",
          requestReason: "Reported reason",
          createdBy: "Recorded by",
          requestedAt: "Recorded at",
          policyOutcome: "Policy outcome",
          hoursBeforeCheckIn: "Hours before check-in",
          standardRefund: "Standard eligible refund",
          policyCalculatedAt: "Policy calculated at",
          checkInAt: "Evaluated check-in",
          reviewedBy: "Decided by",
          decidedAt: "Decided at",
          decisionNote: "Decision reason",
        },
        channels: {
          EMAIL: "Email",
          PHONE: "Phone",
          WHATSAPP: "WhatsApp",
          OTHER: "Other authorized channel",
        },
        statuses: {
          PENDING_REVIEW: "Pending review",
          APPROVED: "Approved",
          REJECTED: "Rejected",
          AWAITING_ADJUSTMENT_PAYMENT: "Awaiting adjustment payment",
          COMPLETED: "Completed",
          WITHDRAWN: "Withdrawn",
          EXPIRED: "Expired",
          FAILED: "Failed",
        },
        policyReasons: {
          AT_LEAST_168_HOURS: "7 days or more before check-in",
          BETWEEN_72_AND_168_HOURS: "From 72 hours through less than 7 days",
          LESS_THAN_72_HOURS: "Less than 72 hours before check-in",
          NOT_APPLICABLE: "Not applicable",
        },
        placeholders: {
          requestReason:
            "Describe what the guest requested and the context needed for review.",
          decisionNote:
            "Briefly explain why the cancellation is approved or rejected.",
        },
        actions: {
          createRequest: "Record request",
          creating: "Recording...",
          approve: "Approve cancellation",
          reject: "Reject request",
          processing: "Processing...",
          close: "Close",
          confirmApprove: "Confirm cancellation",
          confirmReject: "Confirm rejection",
        },
        createDialog: {
          title: "Record cancellation request",
          description:
            "The request will store a snapshot of the reservation, captured payment, and current policy. It will not cancel the stay yet.",
          policyNote:
            "The eligible percentage and amount are calculated on the server using the accommodation check-in time in America/Guatemala.",
        },
        decisionDialog: {
          approveTitle: "Approve cancellation",
          rejectTitle: "Reject request",
          approveDescription:
            "The reservation will change from Confirmed to Cancelled, and its dates and buffers will stop blocking availability.",
          rejectDescription:
            "The request will be rejected, and the reservation will remain confirmed without changing dates, availability, or payments.",
          approveWarning:
            "This action does not process or promise a refund. The displayed amount is the standard policy outcome and will be authorized or reconciled separately in Phase 11.4.",
          rejectWarning:
            "The request and decision history will be preserved for auditing.",
        },
        notes: {
          policyCalculation:
            "The applied matrix is 100% at 168 hours or more, 50% from 72 hours through less than 168, and 0% below 72 hours.",
          refundSeparate:
            "Cancellation and refund are separate decisions. This action does not create a Refund or call Tilopay.",
          availabilityRelease:
            "After approval, availability is released because the reservation is no longer Confirmed. Pending or failed arrival emails are skipped with audit history.",
        },
        states: {
          reservationNotEligible:
            "Only a confirmed, non-cancelled reservation can start this flow.",
          activeRequest:
            "A pending request already exists. It must be approved or rejected before another is recorded.",
        },
        success: {
          requestCreated:
            "The cancellation request was recorded and is pending a decision.",
          cancelled:
            "The cancellation was approved. The reservation and availability were updated successfully.",
          rejected:
            "The request was rejected. The reservation remains confirmed.",
          alreadyCancelled:
            "This request had already cancelled the reservation; the operation was not repeated.",
          alreadyRejected:
            "This request had already been rejected; the operation was not repeated.",
        },
        errors: {
          ADMIN_UNAUTHORIZED: "Your session is not authorized for administration.",
          INVALID_ADMIN_CANCELLATION_REQUEST:
            "Review the channel, contact details, reason, and confirmation before continuing.",
          ADMIN_CANCELLATION_RESERVATION_NOT_FOUND:
            "We could not find the selected reservation.",
          ADMIN_CANCELLATION_RESERVATION_NOT_CONFIRMED:
            "The reservation is no longer confirmed or is no longer eligible for cancellation.",
          ADMIN_CANCELLATION_SOURCE_PAYMENT_NOT_FOUND:
            "We could not find a validated initial payment for the cancellation-policy calculation.",
          ADMIN_CANCELLATION_REQUEST_ALREADY_ACTIVE:
            "A pending cancellation request already exists for this reservation.",
          ADMIN_CANCELLATION_REQUEST_NOT_FOUND:
            "We could not find the selected cancellation request.",
          ADMIN_CANCELLATION_REQUEST_NOT_PENDING:
            "The request has already been decided and does not accept another decision.",
          ADMIN_CANCELLATION_STALE:
            "The reservation or request changed after you opened this page. Reload before continuing.",
          ADMIN_CANCELLATION_UNEXPECTED_ERROR:
            "We could not process the cancellation. Please try again.",
        },
        empty: "This reservation does not have cancellation requests yet.",
      },
      dateMutation: {
        badge: "Authorized changes",
        title: "Date changes and stay extensions",
        description:
          "Record requests received through authorized channels, calculate the server-side quote, and safely apply approved dates once the financial conditions are satisfied.",
        labels: {
          unavailable: "Unavailable",
          requestType: "Request type",
          requestedCheckInDate: "New check-in",
          requestedCheckOutDate: "New check-out",
          channel: "Request channel",
          requesterName: "Requester name",
          requesterEmail: "Optional contact email",
          requesterPhone: "Optional contact phone",
          requesterContact: "Requester contact",
          requestReason: "Reported reason",
          originalStay: "Confirmed stay",
          requestedStay: "Requested stay",
          checkInDate: "Check-in",
          checkOutDate: "Check-out",
          total: "Total",
          financialDifference: "Financial difference",
          pricingMode: "Pricing rule",
          availability: "Availability",
          reviewExpiresAt: "Review expires",
          createdBy: "Recorded by",
          decisionNote: "Decision note",
          holdRemaining: "Adjustment hold remaining",
        },
        requestTypes: {
          DATE_CHANGE: "Full date change",
          STAY_EXTENSION: "Stay extension",
        },
        channels: {
          EMAIL: "Email",
          PHONE: "Phone",
          WHATSAPP: "WhatsApp",
          OTHER: "Other authorized channel",
        },
        statuses: {
          PENDING_REVIEW: "Pending review",
          APPROVED: "Approved",
          REJECTED: "Rejected",
          AWAITING_ADJUSTMENT_PAYMENT: "Awaiting adjustment payment",
          COMPLETED: "Completed",
          WITHDRAWN: "Withdrawn",
          EXPIRED: "Expired",
          FAILED: "Failed",
        },
        pricingModes: {
          FULL_STAY_CURRENT_PRICE: "Entire stay at the current price",
          ADDED_NIGHTS_CURRENT_PRICE:
            "Original total plus added nights at the current price",
        },
        calendar: {
          label: "Requested dates",
          placeholder: "Select check-in and check-out",
          clear: "Clear",
          done: "Done",
          loading: "Loading availability for this month...",
          loadError:
            "We could not load availability. Change months or try again before recording the request.",
          ownReservationExcluded:
            "This reservation's own dates and buffers appear available; every unrelated blocker remains disabled.",
          dateChangeHelper:
            "Select the complete new range. The server will validate availability again when the request is recorded.",
          extensionHelper:
            "The confirmed check-in remains fixed. Select a check-out after the current one.",
        },
        availability: {
          available: "Available when recorded",
          validated:
            "The stay, its buffers, and the accommodation dependencies were available when the request was recorded.",
        },
        placeholders: {
          requestReason:
            "Describe the requested dates and the context an administrator needs to review the request.",
          decisionNote:
            "Document the approval or rejection reason without including sensitive payment data.",
        },
        help: {
          dateFormat: "Use YYYY-MM-DD format.",
          extensionCheckIn:
            "A stay extension must keep the confirmed check-in date.",
        },
        actions: {
          createRequest: "Record change or extension",
          creating: "Recording...",
          confirmCreate: "Calculate and record",
          close: "Close",
          approve: "Approve",
          reject: "Reject",
          deciding: "Processing...",
          confirmApprove: "Confirm approval",
          confirmReject: "Confirm rejection",
          openPaymentLink: "Open payment link",
          copyPaymentLink: "Copy payment link",
          sendPaymentLinkEmail: "Send link by email",
          sendingPaymentLinkEmail: "Sending email...",
        },
        paymentEmail: {
          dialog: {
            title: "Send payment link by email",
            description:
              "The email will be sent to the registered guest with the private link and pending amount.",
            duplicateWarning:
              "At least one delivery was already accepted by the provider. Continuing may duplicate the email to the guest.",
            activeWarning:
              "A delivery is already pending, processing, or scheduled for retry. If it is processing, wait for it to finish; otherwise, continuing will reuse or replace the current attempt while preserving audit history.",
            failedDeliveryNote:
              "The latest delivery ended in a failed state. You can send it again without the duplicate warning.",
            historyNote:
              "Each send creates or reuses an auditable notification. Previous history is not overwritten.",
            cancel: "Cancel",
            confirm: "Send link",
          },
          success: {
            sent: "The provider accepted the payment-link email.",
            queued: "The email is pending delivery.",
            alreadyProcessed:
              "This send request already existed and keeps its current state.",
            failedRetryScheduled:
              "Delivery failed temporarily and was scheduled for retry.",
            failedTerminal:
              "The email could not be sent and has no additional retry scheduled.",
          },
          errors: {
            ADMIN_UNAUTHORIZED:
              "Your session is not authorized to send this email.",
            INVALID_ADMIN_DATE_MUTATION_PAYMENT_EMAIL_REQUEST:
              "The request to send this email is invalid.",
            ADMIN_DATE_MUTATION_PAYMENT_EMAIL_REQUEST_NOT_FOUND:
              "We could not find the related date-change request.",
            ADMIN_DATE_MUTATION_PAYMENT_EMAIL_NOT_AVAILABLE:
              "The payment link is no longer available or the adjustment is no longer pending.",
            ADMIN_DATE_MUTATION_PAYMENT_EMAIL_PROCESSING_ACTIVE:
              "The email is being processed. Wait for it to finish before sending again.",
            ADMIN_DATE_MUTATION_PAYMENT_EMAIL_STALE:
              "The delivery history changed. Refresh the page and try again.",
            ADMIN_DATE_MUTATION_PAYMENT_EMAIL_UNEXPECTED_ERROR:
              "We could not send the payment link by email. Please try again.",
          },
        },
        createDialog: {
          title: "Record a date change or stay extension",
          description:
            "The server will validate eligibility, calculate pricing, and check availability while excluding only this reservation's own blockers.",
          quoteNote:
            "A full date change uses the current price for the entire stay. An extension preserves the confirmed total and adds only the extra nights at the current price.",
          pendingNote:
            "The request will remain pending review for 24 hours. Recording the request does not create the 60-minute hold, charge a difference, or change reservation dates.",
        },
        decisionDialog: {
          approveTitle: "Approve request",
          approveDescription:
            "Availability will be validated again before the decision is accepted.",
          rejectTitle: "Reject request",
          rejectDescription:
            "Rejection closes this request without changing the reservation or creating financial movements.",
          approvalBoundary:
            "A positive difference creates an independent 60-minute hold and an exact payment; dates are applied automatically after the payment is validated. A zero difference completes inside this approval. The negative branch remains reserved for the 11.5.5 refund integration.",
          rejectionBoundary:
            "Rejection preserves the current dates, prices, Confirmed status, payments, and availability.",
        },
        notes: {
          serverQuote:
            "Prices, nights, and differences are calculated only on the server. The browser does not submit totals or rates.",
          availability:
            "Validation excludes only this reservation's stay and derived buffers; every other reservation, Airbnb event, maintenance block, manual block, dependency, and hold remains blocking.",
          noMutation:
            "Recording a request creates no payment, refund, or hold and does not change the reservation dates, price, or Confirmed status.",
          paymentLink:
            "Share this private link only with the guest. It expires with the 60-minute hold and does not change the public 15-minute hold.",
        },
        states: {
          reservationNotEligible:
            "Only a confirmed reservation can record a date change or stay extension.",
          activeCancellation:
            "A cancellation request is active and must be resolved before recording a date change or extension.",
          activeRequest:
            "This reservation already has an active date change or stay extension.",
        },
        success: {
          requestCreated:
            "The request was recorded with its quote and availability validation.",
          requestApproved: "The request was approved successfully.",
          requestRejected: "The request was rejected successfully.",
          paymentLinkCopied: "The private payment link was copied.",
        },
        errors: {
          ADMIN_UNAUTHORIZED: "Your session is not authorized for admin actions.",
          INVALID_ADMIN_DATE_MUTATION_REQUEST:
            "Review the request type, dates, channel, contact details, and reason.",
          ADMIN_DATE_MUTATION_RESERVATION_NOT_FOUND:
            "We could not find the selected reservation.",
          ADMIN_DATE_MUTATION_RESERVATION_NOT_CONFIRMED:
            "The reservation is no longer confirmed or eligible for a date change.",
          ADMIN_DATE_MUTATION_PROPERTY_NOT_ELIGIBLE:
            "The accommodation is no longer active or its configuration cannot price this change.",
          ADMIN_DATE_MUTATION_SOURCE_PAYMENT_NOT_FOUND:
            "We could not find a validated initial payment for this reservation.",
          ADMIN_DATE_MUTATION_DATES_UNCHANGED:
            "The requested dates are the same as the confirmed dates.",
          ADMIN_DATE_MUTATION_DATE_CHANGE_AFTER_CHECK_IN:
            "A full date change must be recorded before both the original and requested check-in times.",
          ADMIN_DATE_MUTATION_EXTENSION_INVALID:
            "An extension must keep the current check-in and use a check-out after the confirmed one.",
          ADMIN_DATE_MUTATION_STAY_ENDED:
            "The stay has ended and can no longer be extended from this reservation.",
          ADMIN_DATE_MUTATION_DATE_HORIZON_EXCEEDED:
            "The requested check-out exceeds the 365-day limit.",
          ADMIN_DATE_MUTATION_DATES_UNAVAILABLE:
            "The requested dates, their buffers, or an accommodation dependency are no longer available.",
          ADMIN_DATE_MUTATION_REQUEST_NOT_FOUND:
            "We could not find the selected date-mutation request.",
          ADMIN_DATE_MUTATION_REQUEST_NOT_PENDING:
            "The request is no longer pending review.",
          ADMIN_DATE_MUTATION_REQUEST_EXPIRED:
            "The request or its review window has expired.",
          ADMIN_DATE_MUTATION_DECISION_CONFLICT:
            "The request already received a different decision or reached a final state.",
          ADMIN_DATE_MUTATION_ADJUSTMENT_PAYMENT_CONFLICT:
            "The request already has an incompatible adjustment hold or payment. Reload before continuing.",
          ADMIN_DATE_MUTATION_REFUND_BALANCE_INSUFFICIENT:
            "The initial payment no longer has enough captured balance to return the exact negative difference.",
          ADMIN_DATE_MUTATION_REQUEST_ALREADY_ACTIVE:
            "This reservation already has an active date change or stay extension.",
          ADMIN_DATE_MUTATION_CANCELLATION_ACTIVE:
            "An active cancellation request must be resolved first.",
          ADMIN_DATE_MUTATION_STALE:
            "The reservation changed after you opened this page. Reload before continuing.",
          ADMIN_DATE_MUTATION_IDEMPOTENCY_CONFLICT:
            "This operation identifier was already used with different data.",
          ADMIN_DATE_MUTATION_COMPLETION_NOT_READY:
            "The request does not yet meet the conditions required to apply the dates.",
          ADMIN_DATE_MUTATION_ADJUSTMENT_PAYMENT_NOT_APPROVED:
            "We could not find an approved exact adjustment payment for this request.",
          ADMIN_DATE_MUTATION_HOLD_NOT_ACTIVE:
            "The requested-date hold is no longer active or does not match the request.",
          ADMIN_DATE_MUTATION_NEGATIVE_COMPLETION_DEFERRED:
            "The negative difference requires the next subphase's refund integration before dates can be completed.",
          ADMIN_DATE_MUTATION_COMPLETION_CONFLICT:
            "Completion was already processed with a different state. Reload the reservation before continuing.",
          ADMIN_DATE_MUTATION_UNEXPECTED_ERROR:
            "We could not record the date change. Please try again.",
        },
        empty:
          "This reservation does not have any date-change or stay-extension requests yet.",
      },
      refunds: {
        badge: "Refunds",
        title: "Refund authorization and reconciliation",
        description:
          "Authorize standard or extraordinary refunds, observe Tilopay sandbox behavior, and confirm financial results only after explicit verification.",
        labels: {
          refund: "Refund",
          payment: "Payment",
          paymentStatus: "Payment status",
          policyAmount: "Policy-authorized amount",
          committedAmount: "Standard amount committed",
          remainingAmount: "Standard policy balance",
          paymentRemainingAmount: "Refundable payment balance",
          authorizationType: "Authorization type",
          amount: "Amount",
          reason: "Internal reason",
          processingMode: "Processing mode",
          requestedBy: "Authorized by",
          createdAt: "Created",
          updatedAt: "Updated",
          providerOrder: "Tilopay order",
          providerRefundId: "Refund reference",
          diagnosticSource: "Diagnostic source",
          responseCode: "Observed code",
          resultClassification: "Classification",
          observedAt: "Observed at",
          observedOrder: "Observed order",
          observedAmount: "Observed amount",
          modificationType: "Modification type",
          candidateCount: "Observed candidates",
          safeDescription: "Safe detail",
          outcome: "Confirmed outcome",
          reconciliationSource: "Verification source",
          finalProcessingMode: "Final mode",
          reconciliationNote: "Reconciliation evidence and note",
          unavailable: "Unavailable",
        },
        statuses: {
          PENDING: "Pending",
          PROCESSING: "Processing / reconciliation required",
          APPROVED: "Approved",
          FAILED: "Failed",
          MANUAL: "Historical manual",
          REFUNDED: "Refunded",
          PARTIALLY_REFUNDED: "Partially refunded",
        },
        authorizationTypes: {
          LEGACY_UNSPECIFIED: "Historical unspecified",
          STANDARD_POLICY: "Cancellation-policy refund",
          EXTRAORDINARY: "Extraordinary refund",
        },
        processingModes: {
          TILOPAY_API: "Tilopay API",
          TILOPAY_PORTAL_FALLBACK: "Tilopay portal",
          LEGACY_UNSPECIFIED: "Historical unspecified mode",
        },
        outcomes: {
          APPROVED: "Refund confirmed",
          FAILED: "Refund not completed",
        },
        resultClassifications: {
          PROVIDER_ACCEPTED_PENDING_CONFIRMATION:
            "Accepted by Tilopay; confirmation pending",
          PROVIDER_ACCEPTED: "Approved evidence found",
          PROVIDER_REJECTED: "Rejected by Tilopay",
          RESULT_UNCERTAIN: "Uncertain result",
          UNCERTAIN: "Uncertain result",
          FAILED_BEFORE_PROVIDER_REQUEST:
            "Failed before contacting the provider",
          CONSULT_MATCH_INCONCLUSIVE:
            "The consult matched the reference but lacked sufficient evidence",
          CONSULT_NO_MATCH:
            "The consult did not find the modification reference",
          CONSULT_REFERENCE_MISSING:
            "No reference is available to correlate the consult",
          APPROVED: "Reconciled as approved",
          FAILED: "Reconciled as failed",
          RECONCILIATION_REQUIRED: "Reconciliation required",
        },
        sources: {
          TILOPAY_CONSULT: "Tilopay consult",
          TILOPAY_PORTAL: "Tilopay admin portal",
        },
        actions: {
          authorize: "Authorize refund",
          authorizeStandard: "Authorize by policy",
          authorizeExtraordinary: "Authorize extraordinary",
          authorizing: "Authorizing...",
          confirmAuthorization: "Create authorization",
          executeSandbox: "Send to sandbox",
          executing: "Sending...",
          consult: "Consult Tilopay",
          consulting: "Consulting...",
          reconcile: "Reconcile result",
          reconciling: "Reconciling...",
          confirmReconciliation: "Confirm reconciliation",
          close: "Close",
        },
        placeholders: {
          reason:
            "Explain why this amount is authorized and document the administrative decision that supports it.",
          providerRefundId:
            "Reference visible in the Tilopay response or portal",
          reconciliationNote:
            "Describe what was verified, where it was confirmed, and why the result is final.",
        },
        notes: {
          separateLifecycle:
            "A refund does not change the reservation lifecycle status. A confirmed reservation remains confirmed and a cancelled reservation remains cancelled; only an approved reconciliation changes the payment's financial status.",
        },
        authorizationDialog: {
          title: "Authorize policy refund",
          description:
            "Create a PENDING record within the remaining allowance of the applied cancellation policy.",
          extraordinaryTitle: "Authorize extraordinary refund",
          extraordinaryDescription:
            "Authorize an administrative compensation outside the standard policy for a confirmed or cancelled reservation, limited by the payment's remaining unrefunded balance.",
          extraordinaryNotice:
            "This refund is not part of the applied cancellation policy and does not cancel the reservation. It may be used as compensation before or during the stay, or after a cancellation, and must include a clear internal reason.",
          warning:
            "This action does not move money yet. Pending, processing, and approved standard refunds reserve the policy balance to prevent over-refunding.",
          extraordinaryWarning:
            "This action does not move money yet. The extraordinary amount will reserve the payment's total refundable balance, not the policy allowance. All refunds combined can never exceed the captured payment.",
        },
        executionDialog: {
          title: "Send request to Tilopay sandbox",
          description:
            "A type 2 modification will be sent for this refund's order and amount.",
          warning:
            "Tilopay does not provide idempotency for repeated requests. A 1101 / Transaction is approved response remains PROCESSING until the movement is verified; observed rejections become FAILED. Never repeat the call after a timeout or uncertain result.",
        },
        reconciliationDialog: {
          title: "Reconcile refund",
          description:
            "API consult evidence can only confirm the outcome derived from a matching movement. Portal verification keeps a manual decision with a required reference and note.",
          warning:
            "Approval changes the payment to partially or fully refunded. Evidence must match the reference, refund type, and observed amount; this decision does not change the reservation lifecycle status.",
          consultEvidenceLocked:
            "Tilopay returned conclusive evidence for this movement. The outcome, source, mode, and reference are locked and will be validated again by the server.",
        },
        success: {
          authorized: "The refund was authorized and is pending processing.",
          authorizationAlreadyExists:
            "This authorization already existed, so another refund was not created.",
          providerAcceptedPending:
            "Tilopay accepted the modification. The payment will not change until the movement is confirmed through consult or portal evidence.",
          providerRejected:
            "Tilopay rejected the modification, and the attempt failed without changing the payment.",
          providerUncertain:
            "The result is uncertain. Do not repeat the modification; verify Tilopay before continuing.",
          executionFailedSafely:
            "The request did not reach the modification operation, and the attempt failed without changing the payment.",
          consultedAccepted:
            "The consult found matching evidence for an approved refund. Review and confirm the derived reconciliation.",
          consultedRejected:
            "The consult found matching evidence for a rejected attempt. Review and confirm the failed outcome.",
          consultedInconclusive:
            "The consult was recorded but did not provide enough evidence for reconciliation. Verify the Tilopay portal.",
          reconciledApproved:
            "The refund was approved and the payment's financial status was updated.",
          reconciledFailed:
            "The attempt was marked failed without changing the reservation status.",
        },
        empty: {
          noRefunds: "This reservation does not have authorized refunds yet.",
          noEligiblePolicy:
            "The standard policy has no refundable balance. An administrator may still authorize an extraordinary refund while the payment has an unrefunded balance.",
          noRefundablePayment:
            "There is no initial payment with a refundable balance available for a refund authorization.",
          cancellationRequired:
            "Cancellation is required only for a policy refund. An extraordinary refund may be authorized while a refundable initial payment remains.",
        },
        errors: {
          ADMIN_UNAUTHORIZED: "Your session is not authorized for administration.",
          INVALID_ADMIN_REFUND_REQUEST:
            "Review the amount, reason, references, and confirmation details.",
          ADMIN_REFUND_LIFECYCLE_REQUEST_NOT_FOUND:
            "The selected cancellation request was not found.",
          ADMIN_REFUND_NOT_FOUND: "The selected refund was not found.",
          ADMIN_REFUND_REQUEST_NOT_COMPLETED:
            "The cancellation request has not been completed yet.",
          ADMIN_REFUND_RESERVATION_NOT_CANCELLED:
            "The reservation must be cancelled before authorizing a policy refund.",
          ADMIN_REFUND_RESERVATION_NOT_ELIGIBLE:
            "Extraordinary refunds may only be authorized while the reservation is confirmed or cancelled.",
          ADMIN_REFUND_PAYMENT_NOT_FOUND:
            "A validated initial payment associated with this reservation was not found.",
          ADMIN_REFUND_PAYMENT_NOT_REFUNDABLE:
            "The payment is no longer in a state that supports this operation.",
          ADMIN_REFUND_POLICY_NOT_ELIGIBLE:
            "The stored policy does not allow this refund authorization.",
          ADMIN_REFUND_AMOUNT_EXCEEDS_POLICY:
            "The amount exceeds the remaining cancellation-policy allowance.",
          ADMIN_REFUND_AMOUNT_EXCEEDS_PAYMENT:
            "The amount exceeds the payment's refundable balance.",
          ADMIN_REFUND_STALE:
            "The request, payment, or refund changed. Refresh the page before continuing.",
          ADMIN_REFUND_NOT_PENDING:
            "Only a pending refund can be sent to the provider.",
          ADMIN_REFUND_NOT_PROCESSING:
            "Only a processing refund can be consulted.",
          ADMIN_REFUND_API_EXECUTION_NOT_ALLOWED:
            "This refund is not configured for Tilopay API execution.",
          ADMIN_REFUND_API_SANDBOX_ONLY:
            "Automated execution remains sandbox-only until the observed contract is closed.",
          ADMIN_REFUND_RECONCILIATION_CONFLICT:
            "The refund already has a different final outcome.",
          ADMIN_REFUND_PROVIDER_UNAVAILABLE:
            "Tilopay could not be consulted. Do not repeat an uncertain modification; verify the provider first.",
          ADMIN_REFUND_UNEXPECTED_ERROR:
            "The refund operation could not be completed. Please try again.",
        },
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
          ADMIN_RESERVATION_DATES_UPDATED: "Reservation dates updated for administration",
          STAY_EXTENSION_CONFIRMED: "Stay extension confirmed",
          REFUND_PROCESSED: "Refund processed",
          ARRIVAL_INSTRUCTIONS: "Arrival instructions",
          ADMIN_NEW_RESERVATION: "New reservation for administration",
          DATE_CHANGE_PAYMENT_REQUIRED:
            "Payment required for date change",
          STAY_EXTENSION_PAYMENT_REQUIRED:
            "Payment required for stay extension",
          ADMIN_DATE_CHANGE_PAYMENT_LINK_DELIVERY_STATUS:
            "Date-change payment email delivery result",
          ADMIN_STAY_EXTENSION_PAYMENT_LINK_DELIVERY_STATUS:
            "Stay-extension payment email delivery result",
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
      operationalHistory: {
        badge: "Protected operational history",
        title: "Reservation operational history",
        description: "Chronological sequence of requests, holds, payments, refunds, emails, and recovery activity. This history is read-only and does not execute business transitions.",
        listAriaLabel: "Reservation operational events",
        empty: "This reservation does not have operational events to display yet.",
        categories: {
          RESERVATION: "Reservation",
          REQUEST: "Request",
          HOLD: "Hold",
          PAYMENT: "Payment",
          REFUND: "Refund",
          EMAIL: "Email",
          RECOVERY: "Recovery",
        },
        labels: {
          actor: "Actor",
          reference: "Primary reference",
          requestType: "Request type",
          paymentPurpose: "Payment purpose",
          refundAuthorizationType: "Refund type",
          amount: "Amount",
          notificationType: "Email type",
          recipient: "Intended recipient",
          locale: "Language",
          origin: "Origin",
          attempts: "Attempts",
          nextAttempt: "Next attempt",
          expiresAt: "Expires",
          scheduledFor: "Scheduled for",
          errorCode: "Safe code",
          providerReference: "Safe provider reference",
          originalDates: "Original dates",
          requestedDates: "Requested dates",
        },
        actor: {
          system: "System",
        },
        referenceKinds: {
          RESERVATION: "Reservation",
          LIFECYCLE_REQUEST: "Request",
          HOLD: "Hold",
          PAYMENT: "Payment",
          REFUND: "Refund",
          EMAIL_NOTIFICATION: "Notification",
        },
        relationKinds: {
          LIFECYCLE_REQUEST: "Related request",
          HOLD: "Related hold",
          PAYMENT: "Related payment",
          REFUND: "Related refund",
          PARENT_NOTIFICATION: "Original notification",
          SOURCE_NOTIFICATION: "Source notification",
        },
        statuses: {
          PENDING_REVIEW: "Pending review",
          APPROVED: "Approved",
          REJECTED: "Rejected",
          AWAITING_ADJUSTMENT_PAYMENT: "Awaiting adjustment payment",
          COMPLETED: "Completed",
          WITHDRAWN: "Withdrawn",
          EXPIRED: "Expired",
          FAILED: "Failed",
          ACTIVE: "Active",
          RELEASED: "Released",
          PENDING: "Pending",
          PROCESSING: "Processing",
          SENT: "Sent",
          SKIPPED: "Skipped",
          CONFIRMED: "Confirmed",
          CANCELLED: "Cancelled",
          PARTIALLY_REFUNDED: "Partially refunded",
          REFUNDED: "Refunded",
        },
        requestTypes: {
          CANCELLATION: "Cancellation",
          DATE_CHANGE: "Date change",
          STAY_EXTENSION: "Stay extension",
        },
        paymentPurposes: {
          INITIAL_RESERVATION: "Initial reservation payment",
          LIFECYCLE_ADJUSTMENT: "Adjustment payment",
        },
        refundAuthorizationTypes: {
          LEGACY_UNSPECIFIED: "Unclassified legacy",
          STANDARD_POLICY: "Cancellation policy",
          EXTRAORDINARY: "Extraordinary",
          LIFECYCLE_ADJUSTMENT: "Stay adjustment",
        },
        events: {
          RESERVATION_CREATED: {
            title: "Reservation created",
            description: "The direct reservation record was created.",
          },
          RESERVATION_CONFIRMED: {
            title: "Reservation confirmed",
            description: "A validated payment confirmed the reservation and its availability.",
          },
          RESERVATION_CANCELLED: {
            title: "Reservation cancelled",
            description: "The authorized cancellation changed the reservation's operational status.",
          },
          CANCELLATION_REQUESTED: {
            title: "Cancellation requested",
            description: "An administrative cancellation request was recorded.",
          },
          CANCELLATION_APPROVED: {
            title: "Cancellation approved",
            description: "An administrator approved the cancellation request.",
          },
          CANCELLATION_REJECTED: {
            title: "Cancellation rejected",
            description: "An administrator rejected the request and preserved the reservation.",
          },
          CANCELLATION_COMPLETED: {
            title: "Cancellation completed",
            description: "The cancellation transition completed successfully.",
          },
          CANCELLATION_FAILED: {
            title: "Cancellation failed",
            description: "The request ended with a safe, audited failure.",
          },
          CANCELLATION_EXPIRED: {
            title: "Cancellation request expired",
            description: "The request stopped being eligible before a decision.",
          },
          CANCELLATION_WITHDRAWN: {
            title: "Cancellation request withdrawn",
            description: "The request was withdrawn without changing the reservation.",
          },
          DATE_CHANGE_REQUESTED: {
            title: "Date change requested",
            description: "Alternative dates and a server-side quote were recorded.",
          },
          DATE_CHANGE_APPROVED: {
            title: "Date change approved",
            description: "An administrator authorized the requested change to continue.",
          },
          DATE_CHANGE_REJECTED: {
            title: "Date change rejected",
            description: "The request was rejected and the confirmed dates were preserved.",
          },
          DATE_CHANGE_COMPLETED: {
            title: "Date change completed",
            description: "The authorized dates were applied to the confirmed reservation.",
          },
          DATE_CHANGE_FAILED: {
            title: "Date change failed",
            description: "Completion could not be applied and preserved the corresponding safe state.",
          },
          DATE_CHANGE_EXPIRED: {
            title: "Date change request expired",
            description: "The request expired before completion.",
          },
          DATE_CHANGE_WITHDRAWN: {
            title: "Date change request withdrawn",
            description: "The request was withdrawn without applying the proposed dates.",
          },
          STAY_EXTENSION_REQUESTED: {
            title: "Stay extension requested",
            description: "A request to extend the stay was recorded.",
          },
          STAY_EXTENSION_APPROVED: {
            title: "Stay extension approved",
            description: "An administrator authorized the extension to continue.",
          },
          STAY_EXTENSION_REJECTED: {
            title: "Stay extension rejected",
            description: "The extension was rejected and the confirmed checkout was preserved.",
          },
          STAY_EXTENSION_COMPLETED: {
            title: "Stay extension completed",
            description: "The new checkout date was applied to the reservation.",
          },
          STAY_EXTENSION_FAILED: {
            title: "Stay extension failed",
            description: "Extension completion ended with a safe failure.",
          },
          STAY_EXTENSION_EXPIRED: {
            title: "Stay extension request expired",
            description: "The request expired before completion.",
          },
          STAY_EXTENSION_WITHDRAWN: {
            title: "Stay extension request withdrawn",
            description: "The request was withdrawn without extending the stay.",
          },
          LIFECYCLE_HOLD_CREATED: {
            title: "Date hold created",
            description: "The requested dates were temporarily held while the adjustment was completed.",
          },
          LIFECYCLE_HOLD_RELEASED: {
            title: "Date hold released",
            description: "The temporary hold stopped participating in availability.",
          },
          LIFECYCLE_HOLD_EXPIRED: {
            title: "Date hold expired",
            description: "The temporary hold expired without a valid completion.",
          },
          PAYMENT_CREATED: {
            title: "Payment recorded",
            description: "A payment attempt associated with the reservation was created.",
          },
          PAYMENT_APPROVED: {
            title: "Payment approved",
            description: "The provider approved the payment and the server validated its result.",
          },
          PAYMENT_REJECTED: {
            title: "Payment rejected",
            description: "The provider rejected the payment attempt.",
          },
          PAYMENT_FAILED: {
            title: "Payment failed",
            description: "The attempt ended safely without assuming approval.",
          },
          PAYMENT_PARTIALLY_REFUNDED: {
            title: "Payment partially refunded",
            description: "An approved reconciliation updated the payment's financial balance.",
          },
          PAYMENT_REFUNDED: {
            title: "Payment refunded",
            description: "The captured amount became fully refunded.",
          },
          REFUND_AUTHORIZED: {
            title: "Refund authorized",
            description: "An administrator created a pending refund authorization.",
          },
          REFUND_PROVIDER_EXECUTION_STARTED: {
            title: "Refund execution started",
            description: "The controlled provider modification submission was started.",
          },
          REFUND_PROVIDER_RESPONSE_OBSERVED: {
            title: "Provider response observed",
            description: "The system recorded a safe classification of the provider response.",
          },
          REFUND_PROVIDER_RESULT_UNCERTAIN: {
            title: "Provider result uncertain",
            description: "The result requires explicit verification before changing financial state.",
          },
          REFUND_PROVIDER_EXECUTION_FAILED: {
            title: "Provider execution failed",
            description: "Execution ended safely without confirming a refund.",
          },
          REFUND_PROVIDER_CONSULT_OBSERVED: {
            title: "Provider consultation observed",
            description: "An administrator reviewed allowlisted provider financial evidence.",
          },
          REFUND_RECONCILED_APPROVED: {
            title: "Refund reconciled as approved",
            description: "The evidence was confirmed and the payment updated its financial status.",
          },
          REFUND_RECONCILED_FAILED: {
            title: "Refund reconciled as failed",
            description: "The evidence confirmed that the refund was not completed.",
          },
          REFUND_APPROVED: {
            title: "Refund approved",
            description: "The refund record reached an approved financial outcome.",
          },
          REFUND_FAILED: {
            title: "Refund failed",
            description: "The attempt remained failed without changing the reservation.",
          },
          EMAIL_CREATED: {
            title: "Notification created",
            description: "A durable email intent was created without causing a business transition.",
          },
          EMAIL_PROCESSING: {
            title: "Email processing",
            description: "A worker acquired the delivery claim for this notification.",
          },
          EMAIL_RETRY_SCHEDULED: {
            title: "Email retry scheduled",
            description: "Delivery failed temporarily and another attempt was scheduled.",
          },
          EMAIL_SENT: {
            title: "Email accepted by provider",
            description: "Resend accepted the message from TRP Booking; this does not confirm reading or opening.",
          },
          EMAIL_FAILED: {
            title: "Email delivery failed",
            description: "Delivery failed and retained normalized, safe diagnostics.",
          },
          EMAIL_SKIPPED: {
            title: "Email skipped",
            description: "The notification stopped being current before delivery.",
          },
          EMAIL_MANUAL_RESEND_REQUESTED: {
            title: "Manual resend requested",
            description: "An administrator created a child notification without rewriting original history.",
          },
        },
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
      houseRules: "House rules",
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
    lifecycleAdjustmentPayment: {
      guest: {
        dateChangeSubjectPrefix:
          "Payment pending to confirm your date change",
        stayExtensionSubjectPrefix:
          "Payment pending to confirm your stay extension",
        preview: "Complete the difference before the hold expires",
        eyebrow: "Action required",
        dateChangeTitle: "Complete payment for your date change",
        stayExtensionTitle: "Complete payment for your stay extension",
        introduction:
          "The request was approved and the difference is ready to be paid through the private link.",
        pendingNotice:
          "The requested dates are not in effect yet. They will be applied only after the payment is approved and the system successfully completes the update.",
        summaryTitle: "Adjustment summary",
        amountLabel: "Amount due",
        holdExpiresAtLabel: "Link available until",
        actionLabel: "Pay difference",
        actionFallback: "If the button does not work, open this link:",
        securityNote:
          "This link is private and expires with the 60-minute hold.",
        supportDescription:
          "For assistance, reply to this email or contact us at",
      },
      adminStatus: {
        sentSubjectPrefix: "Payment email sent to guest",
        failedSubjectPrefix: "Payment email to guest failed",
        sentTitle: "The payment-link email was sent",
        failedTitle: "The payment-link email could not be sent",
        sentIntroduction:
          "The email system accepted the message addressed to the guest.",
        failedIntroduction:
          "The email system finished delivery without sending the message addressed to the guest.",
        sentNote:
          "Resend accepted the message. This confirms sending from our system, not inbox delivery or opening.",
        failedNote:
          "The change is still awaiting payment and has not been applied to the reservation.",
        sourceTitle: "Delivery result",
        requestTypeLabel: "Request type",
        guestRecipientLabel: "Intended recipient",
        sourceNotificationLabel: "Guest notification",
        attemptsLabel: "Attempts",
        observedAtLabel: "Result observed",
        errorCodeLabel: "Safe error code",
      },
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
