export const ADMIN_CALENDAR_ROUTE = "/admin/calendar";
export const ADMIN_CALENDAR_SKELETON_WEEKDAY_COUNT = 7;
export const ADMIN_CALENDAR_SKELETON_CELL_COUNT = 42;

export type AdminCalendarNavigationTarget = Readonly<{
  propertyId: string;
  month: string;
}>;

export type AdminCalendarNavigationState = Readonly<{
  confirmedTarget: AdminCalendarNavigationTarget;
  pendingTarget: AdminCalendarNavigationTarget | null;
}>;

export type AdminCalendarNavigationDecision = Readonly<{
  href: string | null;
  shouldNavigate: boolean;
  state: AdminCalendarNavigationState;
}>;

export function createAdminCalendarNavigationState(
  confirmedTarget: AdminCalendarNavigationTarget,
): AdminCalendarNavigationState {
  return {
    confirmedTarget,
    pendingTarget: null,
  };
}

export function createAdminCalendarHref(
  target: AdminCalendarNavigationTarget,
): string {
  const params = new URLSearchParams({
    propertyId: target.propertyId,
    month: target.month,
  });

  return `${ADMIN_CALENDAR_ROUTE}?${params.toString()}`;
}

export function areAdminCalendarTargetsEqual(
  left: AdminCalendarNavigationTarget,
  right: AdminCalendarNavigationTarget,
): boolean {
  return left.propertyId === right.propertyId && left.month === right.month;
}

export function getVisibleAdminCalendarTarget(
  state: AdminCalendarNavigationState,
): AdminCalendarNavigationTarget {
  return state.pendingTarget ?? state.confirmedTarget;
}

export function requestAdminCalendarNavigation(
  state: AdminCalendarNavigationState,
  target: AdminCalendarNavigationTarget,
): AdminCalendarNavigationDecision {
  if (
    state.pendingTarget ||
    areAdminCalendarTargetsEqual(state.confirmedTarget, target)
  ) {
    return {
      href: null,
      shouldNavigate: false,
      state,
    };
  }

  return {
    href: createAdminCalendarHref(target),
    shouldNavigate: true,
    state: {
      ...state,
      pendingTarget: target,
    },
  };
}

export function reconcileAdminCalendarNavigation(
  state: AdminCalendarNavigationState,
  confirmedTarget: AdminCalendarNavigationTarget,
): AdminCalendarNavigationState {
  if (!state.pendingTarget) {
    return {
      confirmedTarget,
      pendingTarget: null,
    };
  }

  if (areAdminCalendarTargetsEqual(state.pendingTarget, confirmedTarget)) {
    return {
      confirmedTarget,
      pendingTarget: null,
    };
  }

  if (!areAdminCalendarTargetsEqual(state.confirmedTarget, confirmedTarget)) {
    return {
      confirmedTarget,
      pendingTarget: null,
    };
  }

  return state;
}

export function clearAdminCalendarNavigationPending(
  state: AdminCalendarNavigationState,
): AdminCalendarNavigationState {
  if (!state.pendingTarget) {
    return state;
  }

  return {
    ...state,
    pendingTarget: null,
  };
}
