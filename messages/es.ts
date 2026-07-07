export const esMessages = {
  common: {
    brandName: "Tu Refugio Perfecto",
    publicName: "Bungalows Tu Refugio Perfecto",
    bookNow: "Reservar ahora",
    reserve: "Reservar",
    viewAccommodations: "Ver alojamientos",
    viewDetails: "Ver detalles",
    exploreAccommodations: "Explorar alojamientos",
    whyBookDirect: "Por qué reservar directo",
  },
  navigation: {
    mainAriaLabel: "Navegación principal",
    homeAriaLabel: "Ir a la página de inicio",
    locationLabel: "Panajachel, Guatemala",
    items: [
      { label: "Alojamientos", href: "#alojamientos" },
      { label: "Beneficios", href: "#beneficios" },
      { label: "Ubicación", href: "#ubicacion" },
      { label: "Contacto", href: "#contacto" },
    ],
  },
  footer: {
    description:
      "Reservas directas para alojamientos privados en Panajachel, cerca del Lago de Atitlán.",
    navigationTitle: "Navegación",
    contactTitle: "Contacto",
    rights: "Todos los derechos reservados.",
    poweredBy: "Direct booking website desarrollado con",
  },
  home: {
    hero: {
      badge: "Panajachel · Lago de Atitlán",
      title: "Tu descanso privado en Panajachel.",
      description:
        "Bungalows Tu Refugio Perfecto reúne alojamientos cómodos, privados y bien ubicados para reservar directamente cerca del Lago de Atitlán.",
      highlights: [
        "Reservas directas seguras",
        "Alojamientos privados",
        "Cerca del Lago de Atitlán",
      ],
      bookingCard: {
        eyebrow: "Direct Booking",
        title: "Reserva directo, evita intermediarios y recibe confirmación por correo.",
        description:
          "Próximamente integraremos disponibilidad, pagos seguros con Tilopay y sincronización con Airbnb.",
      },
    },
    accommodations: {
      badge: "Alojamientos",
      title: "Elige el espacio ideal para tu estadía.",
      description:
        "Reserva un alojamiento independiente o el refugio completo para disfrutar más privacidad y comodidad en grupo.",
      privateLabel: "Privado",
      composedLabel: "Combinado",
      upToGuestsPrefix: "Hasta",
      guests: "huéspedes",
      from: "Desde",
      perNight: "/ noche",
      bedroomAbbr: "hab.",
      bathroomSingular: "baño",
      bathroomPlural: "baños",
    },
    benefits: {
      badge: "Reserva directa",
      title: "Una experiencia clara, confiable y sin complicaciones.",
      description:
        "El sitio está diseñado para que el huésped pueda revisar información importante, consultar disponibilidad y completar su reserva con confianza.",
      items: [
        {
          title: "Comunicación directa",
          description:
            "Habla directamente con el anfitrión antes y después de reservar, sin depender de intermediarios.",
        },
        {
          title: "Pago seguro en línea",
          description:
            "El flujo de pago estará integrado con Tilopay y la reserva se confirmará únicamente después del pago aprobado.",
        },
        {
          title: "Disponibilidad sincronizada",
          description:
            "El calendario se sincronizará con Airbnb para reducir el riesgo de reservas duplicadas.",
        },
      ],
    },
    location: {
      badge: "Ubicación",
      title: "Panajachel, una base cómoda para vivir el Lago de Atitlán.",
      description:
        "Los alojamientos están pensados para huéspedes que desean privacidad, buena ubicación y una estadía tranquila cerca de restaurantes, tiendas y acceso al lago.",
      highlights: [
        "Cerca de Calle Santander",
        "A pocos minutos del Lago de Atitlán",
        "Ideal para descansar o explorar Panajachel",
      ],
      mapTitle: "Mapa y fotos de llegada",
      mapDescription:
        "Las instrucciones detalladas de llegada se enviarán después de confirmar el pago.",
    },
    trust: {
      badge: "Confianza",
      title: "Información clara antes de pagar.",
      description:
        "La experiencia pública debe ayudar al huésped a sentirse seguro antes de completar una reserva directa.",
      items: [
        "49 reseñas de 5 estrellas en Airbnb",
        "Reglas claras antes de reservar",
        "Confirmación automática por correo",
        "Check-in desde las 8:00 a. m.",
      ],
    },
    cta: {
      eyebrow: "Próximamente",
      title: "Reserva directo en Tu Refugio Perfecto.",
      description:
        "La siguiente fase agregará disponibilidad, pagos seguros y sincronización de calendarios para completar reservas directas.",
    },
  },
  properties: {
    listing: {
      badge: "Alojamientos",
      title: "Espacios privados para descansar en Panajachel.",
      description:
        "Explora cada opción disponible y elige entre un apartamento privado, un bungalow familiar o el refugio completo para grupos pequeños.",
      guests: "huéspedes",
      bedroomAbbr: "hab.",
      night: "noche",
      privateLabel: "Privado",
      composedLabel: "Combinado",
    },
    detail: {
      backToAccommodations: "← Volver a alojamientos",
      privateLabel: "Alojamiento privado",
      composedLabel: "Alojamiento combinado",
      reservationSummary: "Resumen de reserva",
      from: "Desde",
      perNight: "/ noche",
      guests: "huéspedes",
      bedroomAbbr: "hab.",
      bathroomSingular: "baño",
      bathroomPlural: "baños",
      calendarComingSoon: "Calendario próximamente",
      availabilityLater: "La disponibilidad, reserva y pago se conectarán en fases posteriores.",
      mainAmenities: "Amenidades principales",
      rulesBadge: "Reglas",
      beforeBooking: "Antes de reservar",
      rulesDescription:
        "Estas reglas ayudan a mantener un ambiente tranquilo, seguro y cómodo para todos los huéspedes.",
    },
  },
  errors: {
    reservation: {
      unavailableDates: "Las fechas seleccionadas ya no están disponibles.",
      invalidGuestCount: "La cantidad de huéspedes excede la capacidad permitida.",
      expiredReservation: "La reservación expiró antes de completar el pago.",
      dateChangesRequireApproval:
        "Los cambios de fechas requieren autorización previa del administrador.",
    },
    payment: {
      failed:
        "No pudimos completar el pago. Intenta nuevamente o contáctanos para recibir ayuda.",
      webhookNotConfirmed:
        "La reservación aún no puede confirmarse porque el pago no ha sido validado.",
    },
    calendar: {
      syncFailed:
        "No pudimos sincronizar el calendario en este momento. Intenta nuevamente más tarde.",
      preparationBufferConflict:
        "Las fechas seleccionadas no están disponibles por tiempo de preparación del alojamiento.",
    },
  },
} as const;
