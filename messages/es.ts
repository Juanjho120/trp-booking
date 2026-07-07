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
    from: "Desde",
    perNight: "por noche",
    guests: "huéspedes",
    upTo: "Hasta",
    bedrooms: "habitaciones",
    bathrooms: "baños",
  },
  navigation: {
    mainAriaLabel: "Navegación principal",
    homeAriaLabel: "Ir a la página de inicio",
    locationLabel: "Panajachel, Guatemala",
    items: [
      { label: "Inicio", href: "/" },
      { label: "Alojamientos", href: "/alojamientos" },
      { label: "Beneficios", href: "/#beneficios" },
      { label: "Ubicación", href: "/#ubicacion" },
      { label: "Contacto", href: "#contacto" },
    ],
  },
  footer: {
    description:
      "Reservas directas para alojamientos privados en Panajachel, cerca del Lago de Atitlán.",
    navigationTitle: "Navegación",
    contactTitle: "Contacto",
    reservationsEmailLabel: "Reservas",
    englishEmailLabel: "English support",
    adminEmailLabel: "Administración",
    rights: "Todos los derechos reservados.",
    poweredBy: "Direct booking website desarrollado con",
    note:
      "Próximamente podrás consultar disponibilidad, reservar y pagar en línea desde este sitio.",
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
      perNight: "por noche",
      bedroomAbbr: "hab.",
      bathroomSingular: "baño",
      bathroomPlural: "baños",
    },
    benefits: {
      badge: "Reserva directa",
      title: "Una experiencia clara, confiable y sin intermediarios innecesarios.",
      description:
        "La página está pensada para que puedas conocer los alojamientos, revisar información importante y reservar con comunicación directa con el anfitrión.",
      items: [
        {
          title: "Comunicación directa",
          description:
            "Puedes resolver dudas sobre llegada, reglas y disponibilidad sin depender de mensajes dispersos en varias plataformas.",
        },
        {
          title: "Información transparente",
          description:
            "Fotos, amenidades, reglas, políticas y precios se presentan antes de iniciar cualquier reserva.",
        },
        {
          title: "Confirmación por correo",
          description:
            "Cuando el booking esté activo, cada reserva confirmada enviará detalles importantes e instrucciones de llegada.",
        },
      ],
    },
    location: {
      badge: "Ubicación",
      title: "Cerca de Calle Santander y del Lago de Atitlán.",
      description:
        "Los alojamientos están en Panajachel, en una zona práctica para descansar, caminar, visitar restaurantes y explorar el lago.",
      highlights: [
        "Panajachel, Guatemala",
        "Aproximadamente 10 minutos caminando al lago",
        "Cerca de restaurantes y tiendas",
      ],
      mapTitle: "Ubicación general",
      mapDescription:
        "La dirección exacta y las instrucciones detalladas se comparten después de confirmar la reserva.",
    },
    trust: {
      badge: "Confianza",
      title: "Diseñado para reservar con tranquilidad.",
      description:
        "El sitio se construye con políticas claras, fotografías reales, correos oficiales y un flujo de pago seguro para huéspedes nacionales y extranjeros.",
      items: [
        "Fotos reales de los alojamientos",
        "Reglas y políticas visibles antes de reservar",
        "Correos oficiales del dominio turefugioperfecto.com.gt",
        "Pagos seguros con Tilopay en la fase de booking",
      ],
    },
    cta: {
      badge: "Próximamente booking online",
      title: "Explora los alojamientos antes de elegir tus fechas.",
      description:
        "La base pública ya presenta los espacios disponibles. Las próximas fases agregarán calendario, reservas directas, pagos y sincronización con Airbnb.",
    },
  },
  properties: {
    listing: {
      badge: "Alojamientos disponibles",
      title: "Tres formas de hospedarte en Tu Refugio Perfecto.",
      description:
        "Puedes reservar el apartamento, el bungalow o ambos alojamientos juntos como Refugio Completo.",
    },
    detail: {
      backToAccommodations: "Volver a alojamientos",
      privateLabel: "Alojamiento privado",
      composedLabel: "Alojamiento combinado",
      priceTitle: "Resumen",
      from: "Desde",
      perNight: "por noche",
      maxGuests: "Capacidad máxima",
      bedrooms: "Habitaciones",
      bathrooms: "Baños",
      checkIn: "Check-in",
      earlyCheckIn: "Check-in más temprano",
      preparationBuffer: "Bloqueo de preparación",
      preparationBufferDescription:
        "Estos días se bloquean automáticamente antes y después de cada reserva para preparar el alojamiento. El administrador podrá desbloquearlos si conviene.",
      preparationBufferBefore: "día(s) antes",
      preparationBufferAfter: "día(s) después",
      reserveCta: "Reservar este alojamiento",
      reserveComingSoon:
        "El calendario de disponibilidad y el pago en línea se agregarán en próximas fases.",
      galleryTitle: "Galería",
      highlightsTitle: "Detalles destacados",
      amenitiesTitle: "Amenidades",
      rulesTitle: "Reglas importantes",
    },
  },
  errors: {
    reservation: {
      unavailableDates: "Las fechas seleccionadas ya no están disponibles.",
      invalidGuestCount: "La cantidad de huéspedes excede la capacidad permitida.",
      expiredReservation: "La reservación expiró antes de completar el pago.",
    },
    payment: {
      failed:
        "No pudimos completar el pago. Intenta nuevamente o contáctanos para recibir ayuda.",
    },
  },
} as const;
