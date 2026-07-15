export type AdminSafePaymentDiagnostics = Readonly<{
  providerCode: string | null;
  providerMessage: string | null;
  authorization: string | null;
  providerOrder: string | null;
  tilopayTransaction: string | null;
  orderHashStatus: string | null;
}>;

export type AdminReservationSummary = Readonly<{
  id: string;
  propertyName: string;
  propertySlug: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  guestCountry: string | null;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  status: string;
  subtotal: string;
  total: string;
  currency: string;
  expiresAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
  latestPaymentStatus: string | null;
}>;

export type AdminPaymentSummary = Readonly<{
  id: string;
  reservationId: string;
  propertyName: string;
  guestName: string;
  provider: string;
  providerReference: string | null;
  providerTransactionId: string | null;
  status: string;
  amount: string;
  currency: string;
  paidAt: string | null;
  failedAt: string | null;
  createdAt: string;
  updatedAt: string;
  diagnostics: AdminSafePaymentDiagnostics;
}>;

export type AdminPaymentClientEventSummary = Readonly<{
  id: string;
  paymentId: string;
  reservationId: string;
  eventType: string;
  environment: string | null;
  locale: string | null;
  paymentMethodName: string | null;
  paymentMethodType: string | null;
  detectedCardBrand: string | null;
  sdkMessage: string | null;
  preflightStatus: string | null;
  preflightExpiresAt: string | null;
  createdAt: string;
}>;

export type AdminStatusCount = Readonly<{
  status: string;
  count: number;
}>;

export type AdminReservationPaymentReviewStats = Readonly<{
  totalReservations: number;
  reservationStatuses: readonly AdminStatusCount[];
  totalPayments: number;
  paymentStatuses: readonly AdminStatusCount[];
  totalClientEvents: number;
}>;

export type AdminReservationPaymentReview = Readonly<{
  generatedAt: string;
  stats: AdminReservationPaymentReviewStats;
  reservations: readonly AdminReservationSummary[];
  payments: readonly AdminPaymentSummary[];
  clientEvents: readonly AdminPaymentClientEventSummary[];
}>;
