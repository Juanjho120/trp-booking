"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ComponentProps,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import { cn } from "@/lib/utils";

type AdminNavigationHref = ComponentProps<typeof Link>["href"];
type AdminNavigationLinkProps = ComponentProps<typeof Link> &
  Readonly<{
    navigation?: AdminRouteNavigationController;
    pendingClassName?: string;
    showPendingIndicator?: boolean;
  }>;

function hrefToString(href: AdminNavigationHref): string {
  if (typeof href === "string") {
    return href;
  }

  const pathname = href.pathname ?? "";
  const query = href.query
    ? new URLSearchParams(
        Object.entries(href.query).flatMap(([key, value]) => {
          if (value === undefined) {
            return [];
          }

          return [[key, String(value)]];
        }),
      ).toString()
    : "";
  const hash = href.hash ? `#${href.hash}` : "";

  return `${pathname}${query ? `?${query}` : ""}${hash}`;
}

function normalizePathWithSearch(value: string): string {
  try {
    const url = new URL(value, "https://trp-booking.local");
    return `${url.pathname}${url.search}`;
  } catch {
    return value;
  }
}

function isNativeNavigationEvent(
  event: MouseEvent<HTMLAnchorElement>,
): boolean {
  const target = event.currentTarget.getAttribute("target");
  const download = event.currentTarget.getAttribute("download");

  return (
    event.button !== 0 ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    Boolean(download) ||
    Boolean(target && target !== "_self")
  );
}

function composeCurrentPath(
  pathname: string,
  searchParams: Readonly<{ toString: () => string }>,
): string {
  const search = searchParams.toString();
  return `${pathname}${search ? `?${search}` : ""}`;
}

function normalizeDestination(
  href: AdminNavigationHref,
  currentPath: string,
): string {
  const hrefString = hrefToString(href);

  if (hrefString.startsWith("#")) {
    return `${currentPath}${hrefString}`;
  }

  return hrefString;
}

function isActivationKey(event: KeyboardEvent<HTMLAnchorElement>): boolean {
  return event.key === "Enter" || event.key === " ";
}

export function useAdminRouteNavigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isRoutePending, startRouteTransition] = useTransition();
  const observedPendingTransitionRef = useRef(false);
  const currentPath = composeCurrentPath(pathname, searchParams);
  const normalizedCurrentPath = normalizePathWithSearch(currentPath);
  const normalizedPendingHref = pendingHref
    ? normalizePathWithSearch(pendingHref)
    : null;
  const isPending = pendingHref !== null;

  useEffect(() => {
    if (!normalizedPendingHref) {
      return;
    }

    if (normalizedCurrentPath === normalizedPendingHref) {
      observedPendingTransitionRef.current = false;
      setPendingHref(null);
    }
  }, [normalizedCurrentPath, normalizedPendingHref]);

  useEffect(() => {
    if (isRoutePending) {
      observedPendingTransitionRef.current = true;
      return;
    }

    if (!observedPendingTransitionRef.current || !pendingHref) {
      return;
    }

    observedPendingTransitionRef.current = false;
    setPendingHref(null);
  }, [isRoutePending, pendingHref]);

  function isPendingFor(href: AdminNavigationHref): boolean {
    return (
      normalizedPendingHref ===
      normalizePathWithSearch(normalizeDestination(href, currentPath))
    );
  }

  function navigate(
    href: AdminNavigationHref,
    event?: MouseEvent<HTMLAnchorElement>,
    options: Readonly<{ scroll?: boolean }> = {},
  ): void {
    const destination = normalizeDestination(href, currentPath);
    const normalizedDestination = normalizePathWithSearch(destination);

    if (event && isNativeNavigationEvent(event)) {
      return;
    }

    if (
      normalizedDestination === normalizedCurrentPath ||
      normalizedDestination === normalizedPendingHref
    ) {
      event?.preventDefault();
      return;
    }

    if (pendingHref !== null) {
      event?.preventDefault();
      return;
    }

    event?.preventDefault();
    observedPendingTransitionRef.current = false;
    setPendingHref(destination);
    startRouteTransition(() => {
      router.push(destination, { scroll: options.scroll });
    });
  }

  function preventPendingKeyboardActivation(
    event: KeyboardEvent<HTMLAnchorElement>,
  ): void {
    if (pendingHref !== null && isActivationKey(event)) {
      event.preventDefault();
    }
  }

  function getLinkProps(
    href: AdminNavigationHref,
    options: Readonly<{ scroll?: boolean }> = {},
  ) {
    const pendingForLink = isPendingFor(href);
    const disabled = pendingHref !== null;

    return {
      "aria-busy": pendingForLink ? true : undefined,
      "aria-disabled": disabled ? true : undefined,
      "data-admin-navigation-pending": pendingForLink ? "true" : undefined,
      href,
      onClick: (event: MouseEvent<HTMLAnchorElement>) => {
        navigate(href, event, options);
      },
      onKeyDown: preventPendingKeyboardActivation,
      prefetch: false,
      tabIndex: disabled && !pendingForLink ? -1 : undefined,
    };
  }

  return {
    currentPath,
    getLinkProps,
    isPending,
    isPendingFor,
    navigate,
    pendingHref,
  };
}

export type AdminRouteNavigationController = ReturnType<
  typeof useAdminRouteNavigation
>;

export const AdminNavigationLink = forwardRef<
  HTMLAnchorElement,
  AdminNavigationLinkProps
>(function AdminNavigationLink(
  {
    children,
    className,
    href,
    navigation,
    onClick,
    onKeyDown,
    pendingClassName,
    prefetch,
    scroll,
    showPendingIndicator = true,
    ...props
  },
  ref,
) {
  const internalNavigation = useAdminRouteNavigation();
  const controller = navigation ?? internalNavigation;
  const pending = controller.isPendingFor(href);
  const disabled = controller.isPending;

  return (
    <Link
      {...props}
      aria-busy={pending ? true : props["aria-busy"]}
      aria-disabled={disabled ? true : props["aria-disabled"]}
      className={cn(
        className,
        pending && (pendingClassName ?? "opacity-80"),
        disabled &&
          !pending &&
          "pointer-events-none cursor-not-allowed opacity-60",
      )}
      data-admin-navigation-pending={pending ? "true" : undefined}
      href={href}
      onClick={(event) => {
        onClick?.(event);

        if (event.defaultPrevented) {
          return;
        }

        controller.navigate(href, event, { scroll });
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);

        if (event.defaultPrevented) {
          return;
        }

        if (disabled && isActivationKey(event)) {
          event.preventDefault();
        }
      }}
      prefetch={prefetch ?? false}
      ref={ref}
      scroll={scroll}
      tabIndex={disabled && !pending ? -1 : props.tabIndex}
    >
      {children}
      {pending && showPendingIndicator ? (
        <Loader2
          aria-hidden="true"
          className="ml-2 size-4 shrink-0 animate-spin motion-reduce:animate-none"
        />
      ) : null}
    </Link>
  );
});
