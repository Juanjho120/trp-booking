import { adminApiErrorResponse } from "./api-response";
import { AdminAdditionalChargeError } from "./additional-charges";

export function adminAdditionalChargeErrorResponse(error: unknown) {
  if (!(error instanceof AdminAdditionalChargeError)) {
    return adminApiErrorResponse(
      "ADMIN_ADDITIONAL_CHARGE_UNEXPECTED_ERROR",
      500,
    );
  }

  switch (error.code) {
    case "INVALID_ADMIN_ADDITIONAL_CHARGE_REQUEST":
    case "ADMIN_GUEST_PAYMENT_REQUEST_CHARGES_REQUIRED":
      return adminApiErrorResponse(error.code, 400);
    case "ADMIN_ADDITIONAL_CHARGE_RESERVATION_NOT_FOUND":
    case "ADMIN_ADDITIONAL_CHARGE_NOT_FOUND":
    case "ADMIN_GUEST_PAYMENT_REQUEST_NOT_FOUND":
      return adminApiErrorResponse(error.code, 404);
    case "ADMIN_ADDITIONAL_CHARGE_RESERVATION_NOT_ELIGIBLE":
    case "ADMIN_ADDITIONAL_CHARGE_NOT_EDITABLE":
    case "ADMIN_ADDITIONAL_CHARGE_ACTIVE_REQUEST":
    case "ADMIN_ADDITIONAL_CHARGE_STALE":
    case "ADMIN_GUEST_PAYMENT_REQUEST_CHARGE_NOT_ELIGIBLE":
    case "ADMIN_GUEST_PAYMENT_REQUEST_ACTIVE_CONFLICT":
    case "ADMIN_GUEST_PAYMENT_REQUEST_IDEMPOTENCY_CONFLICT":
    case "ADMIN_GUEST_PAYMENT_REQUEST_NOT_CANCELLABLE":
    case "ADMIN_GUEST_PAYMENT_REQUEST_STALE":
      return adminApiErrorResponse(error.code, 409);
    case "ADMIN_UNAUTHORIZED":
      return adminApiErrorResponse(error.code, 401);
    case "ADMIN_ADDITIONAL_CHARGE_ORIGIN_INVALID":
      return adminApiErrorResponse(error.code, 403);
    case "ADMIN_ADDITIONAL_CHARGE_UNEXPECTED_ERROR":
    default:
      return adminApiErrorResponse(
        "ADMIN_ADDITIONAL_CHARGE_UNEXPECTED_ERROR",
        500,
      );
  }
}
