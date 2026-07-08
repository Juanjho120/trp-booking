import type { Locale } from "@/types/locale";

export type ReservationRequestUxCopy = Readonly<{
  dateRange: {
    label: string;
    buttonPlaceholder: string;
    helper: string;
    clear: string;
    done: string;
  };
  guests: {
    label: string;
    placeholder: string;
  };
  country: {
    label: string;
    placeholder: string;
    search: string;
    noResults: string;
  };
  phone: {
    label: string;
    localNumber: string;
  };
  arrivalTime: {
    label: string;
    placeholder: string;
  };
  locale: {
    label: string;
  };
}>;

const copies: Record<Locale, ReservationRequestUxCopy> = {
  es: {
    dateRange: {
      label: "Fechas de estadía",
      buttonPlaceholder: "Selecciona fecha de entrada y salida",
      helper: "Selecciona la fecha de entrada y luego la fecha de salida. La salida no cuenta como noche reservada.",
      clear: "Limpiar fechas",
      done: "Listo",
    },
    guests: {
      label: "Huéspedes",
      placeholder: "Selecciona huéspedes",
    },
    country: {
      label: "País",
      placeholder: "Selecciona tu país",
      search: "Buscar país...",
      noResults: "No encontramos ese país.",
    },
    phone: {
      label: "Teléfono",
      localNumber: "Número local",
    },
    arrivalTime: {
      label: "Hora estimada de llegada",
      placeholder: "Selecciona una hora",
    },
    locale: {
      label: "Idioma",
    },
  },
  en: {
    dateRange: {
      label: "Stay dates",
      buttonPlaceholder: "Select check-in and check-out",
      helper: "Select the check-in date and then the check-out date. Check-out is not counted as a reserved night.",
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
};

export function getReservationRequestUxCopy(locale: Locale): ReservationRequestUxCopy {
  return copies[locale];
}
