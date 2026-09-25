const DEFAULT_TARGET_PATH = "/admin/notifications";
const ADMIN_PATH_PATTERN = /^\/admin(?:\/|$)/;

function sanitizeText(value, fallback, maxLength) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  return trimmed.slice(0, maxLength);
}

function sanitizeTargetPath(value) {
  if (typeof value !== "string") {
    return DEFAULT_TARGET_PATH;
  }

  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return DEFAULT_TARGET_PATH;
  }

  let parsed;
  try {
    parsed = new URL(trimmed, self.location.origin);
  } catch {
    return DEFAULT_TARGET_PATH;
  }

  if (
    parsed.origin !== self.location.origin ||
    !ADMIN_PATH_PATTERN.test(parsed.pathname)
  ) {
    return DEFAULT_TARGET_PATH;
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function parsePushPayload(event) {
  if (!event.data) {
    return {};
  }

  try {
    const payload = event.data.json();
    return payload && typeof payload === "object" ? payload : {};
  } catch {
    return {};
  }
}

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      const payload = parsePushPayload(event);
      const title = sanitizeText(payload.title, "TRP Admin", 80);
      const body = sanitizeText(payload.body, "", 180);
      const targetPath = sanitizeTargetPath(payload.targetPath);

      await self.registration.showNotification(title, {
        body,
        icon: "/brand/favicon-192.png",
        data: { targetPath },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const targetPath = sanitizeTargetPath(event.notification.data?.targetPath);
      const targetUrl = new URL(targetPath, self.location.origin).href;
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windowClients) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin !== self.location.origin) {
          continue;
        }

        if ("navigate" in client) {
          await client.navigate(targetUrl);
        }

        await client.focus();
        return;
      }

      await self.clients.openWindow(targetUrl);
    })(),
  );
});
