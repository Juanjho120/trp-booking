"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCheck,
  ExternalLink,
  MessageCircle,
  Paperclip,
  Send,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocale } from "@/features/i18n";
import {
  formatWhatsAppReservationsTabLabel,
  getDisplayedWhatsAppReservationCount,
} from "@/lib/admin/whatsapp-display";
import type {
  AdminWhatsAppConversationSummary,
  AdminWhatsAppErrorCode,
  AdminWhatsAppMessageSummary,
  AdminWhatsAppPageData,
  AdminWhatsAppReservationSummary,
} from "@/types/admin-whatsapp";
import type { Locale } from "@/types/locale";

import { AdminPageHeader } from "./admin-page-header";
import { AdminSnackbar } from "./admin-snackbar";

type AdminWhatsAppCopy = ReturnType<
  typeof useLocale
>["messages"]["admin"]["whatsappPage"];

type MarkReadResponse =
  | Readonly<{ conversation: AdminWhatsAppConversationSummary }>
  | Readonly<{ error: { code: AdminWhatsAppErrorCode | string } }>;

type SendMessageResponse =
  | Readonly<{
      message: AdminWhatsAppMessageSummary;
      deliveryAttempted: boolean;
    }>
  | Readonly<{ error: { code: AdminWhatsAppErrorCode | string } }>;

const WHATSAPP_CHAT_TAB = "chat";
const WHATSAPP_RESERVATIONS_TAB = "reservations";
const WHATSAPP_REPLY_MAX_LENGTH = 1600;

type PendingLogicalReplyRequest = Readonly<{
  clientRequestId: string;
  normalizedBody: string;
}>;

function getIntlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "es-GT";
}

function isErrorResponse(
  response: MarkReadResponse | SendMessageResponse,
): response is { error: { code: string } } {
  return "error" in response;
}

function createClientRequestId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AdminWhatsAppPageView({
  data,
}: Readonly<{ data: AdminWhatsAppPageData }>) {
  const router = useRouter();
  const { locale, messages } = useLocale();
  const copy = messages.admin.whatsappPage;
  const intlLocale = getIntlLocale(locale);
  const [busyConversationId, setBusyConversationId] = useState<string | null>(
    null,
  );
  const [sendingConversationId, setSendingConversationId] = useState<
    string | null
  >(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function formatDateTime(value: string | null): string {
    if (!value) return copy.labels.unavailable;

    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Guatemala",
    }).format(new Date(value));
  }

  function formatDate(value: string): string {
    return new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(value));
  }

  function propertyName(
    conversation: AdminWhatsAppConversationSummary,
  ): string {
    const property = conversation.reservation?.property;
    if (!property) return copy.labels.unlinked;

    return locale === "en" ? property.nameEn : property.nameEs;
  }

  function buildUrl(
    overrides: Record<string, string | number | undefined>,
  ): string {
    const params = new URLSearchParams();
    const values = {
      conversationId: data.selectedConversation?.id,
      page: data.pagination.page,
      ...overrides,
    };

    Object.entries(values).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== 1) {
        params.set(key, String(value));
      }
    });

    const query = params.toString();
    return query ? `/admin/whatsapp?${query}` : "/admin/whatsapp";
  }

  function resolveError(code: string): string {
    if (code in copy.errors) {
      return copy.errors[code as keyof typeof copy.errors];
    }

    return copy.errors.ADMIN_WHATSAPP_UNEXPECTED_ERROR;
  }

  async function markRead(conversationId: string): Promise<void> {
    setBusyConversationId(conversationId);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/admin/whatsapp/conversations/${encodeURIComponent(
          conversationId,
        )}/read`,
        {
          method: "PATCH",
          headers: {
            accept: "application/json",
          },
        },
      );
      const payload = (await response.json()) as MarkReadResponse;

      if (!response.ok || isErrorResponse(payload)) {
        const code = isErrorResponse(payload)
          ? payload.error.code
          : "ADMIN_WHATSAPP_UNEXPECTED_ERROR";
        setErrorMessage(resolveError(code));
        router.refresh();
        return;
      }

      setSuccessMessage(copy.feedback.markedRead);
      router.refresh();
    } catch {
      setErrorMessage(copy.errors.ADMIN_WHATSAPP_UNEXPECTED_ERROR);
    } finally {
      setBusyConversationId(null);
    }
  }

  async function sendMessage(
    conversationId: string,
    body: string,
    clientRequestId: string,
  ): Promise<boolean> {
    setSendingConversationId(conversationId);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/admin/whatsapp/conversations/${encodeURIComponent(
          conversationId,
        )}/messages`,
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            body,
            clientRequestId,
          }),
        },
      );
      const payload = (await response.json()) as SendMessageResponse;

      if (!response.ok || isErrorResponse(payload)) {
        const code = isErrorResponse(payload)
          ? payload.error.code
          : "ADMIN_WHATSAPP_UNEXPECTED_ERROR";
        setErrorMessage(resolveError(code));
        router.refresh();
        return false;
      }

      setSuccessMessage(copy.feedback.messageSent);
      router.refresh();
      return true;
    } catch {
      setErrorMessage(copy.errors.ADMIN_WHATSAPP_UNEXPECTED_ERROR);
      return false;
    } finally {
      setSendingConversationId(null);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        badge={copy.badge}
        description={copy.description}
        title={copy.title}
      />

      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Card className="overflow-hidden rounded-lg border-border/80">
          <CardContent className="p-0">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">
                {copy.sections.conversations}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {copy.labels.results}: {data.pagination.totalItems}
              </p>
            </div>

            {data.conversations.length === 0 ? (
              <div className="px-4 py-10 text-sm text-muted-foreground">
                {copy.empty.noConversations}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.conversations.map((conversation) => (
                  <ConversationListItem
                    conversation={conversation}
                    copy={copy}
                    formatDateTime={formatDateTime}
                    href={buildUrl({
                      conversationId: conversation.id,
                      page: data.pagination.page,
                    })}
                    key={conversation.id}
                    propertyName={propertyName(conversation)}
                    selected={
                      conversation.id === data.selectedConversation?.id
                    }
                  />
                ))}
              </div>
            )}

            {data.pagination.totalPages > 1 ? (
              <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
                <span className="text-xs text-muted-foreground">
                  {copy.labels.page} {data.pagination.page} {copy.labels.of}{" "}
                  {data.pagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    asChild
                    disabled={data.pagination.page <= 1}
                    size="sm"
                    variant="outline"
                  >
                    <Link
                      href={buildUrl({
                        page: Math.max(1, data.pagination.page - 1),
                      })}
                    >
                      {copy.actions.previous}
                    </Link>
                  </Button>
                  <Button
                    asChild
                    disabled={data.pagination.page >= data.pagination.totalPages}
                    size="sm"
                    variant="outline"
                  >
                    <Link
                      href={buildUrl({
                        page: Math.min(
                          data.pagination.totalPages,
                          data.pagination.page + 1,
                        ),
                      })}
                    >
                      {copy.actions.next}
                    </Link>
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-lg border-border/80">
          <CardContent className="p-0">
            {data.selectedConversation ? (
              <ConversationPanel
                busy={
                  busyConversationId === data.selectedConversation.id
                }
                conversation={data.selectedConversation}
                copy={copy}
                formatDate={formatDate}
                formatDateTime={formatDateTime}
                messages={data.messages}
                onMarkRead={markRead}
                onSendMessage={sendMessage}
                propertyName={propertyName(data.selectedConversation)}
                sending={
                  sendingConversationId === data.selectedConversation.id
                }
              />
            ) : (
              <div className="flex min-h-[24rem] flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                <MessageCircle
                  aria-hidden="true"
                  className="size-10 text-muted-foreground"
                />
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    {copy.empty.noSelectionTitle}
                  </h2>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    {copy.empty.noSelectionDescription}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AdminSnackbar
        closeLabel={copy.actions.dismiss}
        message={successMessage}
        onDismiss={() => setSuccessMessage(null)}
        variant="success"
      />
      <AdminSnackbar
        closeLabel={copy.actions.dismiss}
        message={errorMessage}
        onDismiss={() => setErrorMessage(null)}
        variant="error"
      />
    </div>
  );
}

function ConversationListItem({
  conversation,
  copy,
  formatDateTime,
  href,
  propertyName,
  selected,
}: Readonly<{
  conversation: AdminWhatsAppConversationSummary;
  copy: AdminWhatsAppCopy;
  formatDateTime: (value: string | null) => string;
  href: string;
  propertyName: string;
  selected: boolean;
}>) {
  return (
    <Link
      aria-current={selected ? "page" : undefined}
      className={[
        "block px-4 py-3 transition hover:bg-muted/70",
        selected ? "bg-muted" : "",
      ].join(" ")}
      href={href}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {conversation.guestPhoneE164}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {propertyName}
          </p>
        </div>
        {conversation.unreadCount > 0 ? (
          <Badge variant="default">{conversation.unreadCount}</Badge>
        ) : null}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{formatDateTime(conversation.lastMessageAt)}</span>
        <span>
          {conversation.linkState === "LINKED"
            ? copy.labels.linked
            : copy.labels.unlinked}
        </span>
      </div>
    </Link>
  );
}

function ConversationPanel({
  busy,
  conversation,
  copy,
  formatDate,
  formatDateTime,
  messages,
  onMarkRead,
  onSendMessage,
  propertyName,
  sending,
}: Readonly<{
  busy: boolean;
  conversation: AdminWhatsAppConversationSummary;
  copy: AdminWhatsAppCopy;
  formatDate: (value: string) => string;
  formatDateTime: (value: string | null) => string;
  messages: readonly AdminWhatsAppMessageSummary[];
  onMarkRead: (conversationId: string) => Promise<void>;
  onSendMessage: (
    conversationId: string,
    body: string,
    clientRequestId: string,
  ) => Promise<boolean>;
  propertyName: string;
  sending: boolean;
}>) {
  const reservationsTabLabel = formatWhatsAppReservationsTabLabel(
    copy.tabs.reservations,
    getDisplayedWhatsAppReservationCount(conversation),
  );

  return (
    <div className="flex min-h-[34rem] flex-col">
      <div className="border-b border-border px-5 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">
                {conversation.guestPhoneE164}
              </h2>
              <Badge
                variant={
                  conversation.linkState === "LINKED" ? "default" : "secondary"
                }
              >
                {conversation.linkState === "LINKED"
                  ? copy.labels.linked
                  : copy.labels.unlinked}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {propertyName}
            </p>
            <div className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              <span>
                {copy.labels.lastInbound}:{" "}
                {formatDateTime(conversation.lastInboundAt)}
              </span>
              <span>
                {copy.labels.windowExpires}:{" "}
                {formatDateTime(conversation.freeformWindowExpiresAt)}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {conversation.reservation ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/admin/reservations/${conversation.reservation.id}`}>
                  <ExternalLink aria-hidden="true" />
                  {copy.actions.openReservation}
                </Link>
              </Button>
            ) : null}
            <Button
              disabled={busy || conversation.unreadCount === 0}
              onClick={() => void onMarkRead(conversation.id)}
              size="sm"
              type="button"
              variant="secondary"
            >
              <CheckCheck aria-hidden="true" />
              {busy ? copy.actions.markingRead : copy.actions.markRead}
            </Button>
          </div>
        </div>
      </div>

      <Tabs
        className="flex min-h-0 flex-1 flex-col"
        defaultValue={WHATSAPP_CHAT_TAB}
        key={conversation.id}
      >
        <div className="border-b border-border px-5 py-3">
          <TabsList className="grid w-full grid-cols-2 sm:w-fit">
            <TabsTrigger
              className="min-h-10 min-w-0 px-2 sm:px-3"
              value={WHATSAPP_CHAT_TAB}
            >
              {copy.tabs.chat}
            </TabsTrigger>
            <TabsTrigger
              className="min-h-10 min-w-0 px-2 sm:px-3"
              value={WHATSAPP_RESERVATIONS_TAB}
            >
              {reservationsTabLabel}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          className="m-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
          value={WHATSAPP_CHAT_TAB}
        >
          <div className="border-b border-border px-5 py-3">
            <p className="text-xs text-muted-foreground">
              {copy.descriptionReply}
            </p>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/20 px-4 py-4">
            {messages.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-background px-4 py-10 text-center text-sm text-muted-foreground">
                {copy.empty.noMessages}
              </div>
            ) : (
              messages.map((message) => (
                <MessageBubble
                  copy={copy}
                  formatDateTime={formatDateTime}
                  key={message.id}
                  message={message}
                />
              ))
            )}
          </div>
          <ReplyComposer
            conversation={conversation}
            copy={copy}
            disabled={sending}
            maxLength={WHATSAPP_REPLY_MAX_LENGTH}
            onSendMessage={onSendMessage}
          />
        </TabsContent>

        <TabsContent
          className="m-0 min-h-0 flex-1 overflow-y-auto bg-muted/20 px-4 py-4 data-[state=inactive]:hidden"
          value={WHATSAPP_RESERVATIONS_TAB}
        >
          <CandidateReservationSection
            conversation={conversation}
            copy={copy}
            formatDate={formatDate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function formatCharacterCount(pattern: string, count: number, max: number): string {
  return pattern.replace("{count}", String(count)).replace("{max}", String(max));
}

function ReplyComposer({
  conversation,
  copy,
  disabled,
  maxLength,
  onSendMessage,
}: Readonly<{
  conversation: AdminWhatsAppConversationSummary;
  copy: AdminWhatsAppCopy;
  disabled: boolean;
  maxLength: number;
  onSendMessage: (
    conversationId: string,
    body: string,
    clientRequestId: string,
  ) => Promise<boolean>;
}>) {
  const [body, setBody] = useState("");
  const [pendingLogicalRequest, setPendingLogicalRequest] =
    useState<PendingLogicalReplyRequest | null>(null);
  const normalizedLength = body.trim().length;
  const normalizedBody = body.trim();
  const canSend =
    conversation.freeformReplyAllowed &&
    !disabled &&
    normalizedBody.length > 0 &&
    normalizedLength <= maxLength;
  const composerId = `whatsapp-reply-${conversation.id}`;
  const helperId = `${composerId}-helper`;

  function handleBodyChange(value: string): void {
    setBody(value);

    if (
      pendingLogicalRequest &&
      pendingLogicalRequest.normalizedBody !== value.trim()
    ) {
      setPendingLogicalRequest(null);
    }
  }

  async function submitMessage(): Promise<void> {
    if (!canSend) {
      return;
    }

    const logicalRequest =
      pendingLogicalRequest?.normalizedBody === normalizedBody
        ? pendingLogicalRequest
        : {
            clientRequestId: createClientRequestId(),
            normalizedBody,
          };

    setPendingLogicalRequest(logicalRequest);

    const sent = await onSendMessage(
      conversation.id,
      body,
      logicalRequest.clientRequestId,
    );

    if (sent) {
      setBody("");
      setPendingLogicalRequest(null);
    }
  }

  if (!conversation.freeformReplyAllowed) {
    return (
      <div className="border-t border-border bg-background px-5 py-4">
        <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
          {copy.reply.windowClosed}
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-background px-5 py-4">
      <label
        className="text-sm font-medium text-foreground"
        htmlFor={composerId}
      >
        {copy.reply.label}
      </label>
      <textarea
        aria-describedby={helperId}
        className="mt-2 min-h-24 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        id={composerId}
        maxLength={maxLength}
        onChange={(event) => handleBodyChange(event.target.value)}
        placeholder={copy.reply.placeholder}
        value={body}
      />
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={[
            "text-xs",
            normalizedLength > maxLength
              ? "text-destructive"
              : "text-muted-foreground",
          ].join(" ")}
          id={helperId}
        >
          {formatCharacterCount(
            copy.reply.characterCount,
            normalizedLength,
            maxLength,
          )}
        </p>
        <Button
          disabled={!canSend}
          onClick={() => void submitMessage()}
          size="sm"
          type="button"
        >
          <Send aria-hidden="true" />
          {disabled ? copy.actions.sendingReply : copy.actions.sendReply}
        </Button>
      </div>
    </div>
  );
}

function candidatePropertyName(
  reservation: AdminWhatsAppReservationSummary,
  locale: Locale,
): string {
  return locale === "en"
    ? reservation.property.nameEn
    : reservation.property.nameEs;
}

function formatCountLabel(value: string, count: number): string {
  return value.replace("{count}", String(count));
}

function reservationStatusLabel(
  copy: AdminWhatsAppCopy,
  status: AdminWhatsAppReservationSummary["status"],
): string {
  return copy.reservationStatuses[status] ?? status;
}

function CandidateReservationSection({
  conversation,
  copy,
  formatDate,
}: Readonly<{
  conversation: AdminWhatsAppConversationSummary;
  copy: AdminWhatsAppCopy;
  formatDate: (value: string) => string;
}>) {
  const { locale } = useLocale();
  const linkedReservation = conversation.reservation;
  const otherCandidates = linkedReservation
    ? conversation.candidateReservations.filter(
        (candidate) => candidate.id !== linkedReservation.id,
      )
    : conversation.candidateReservations;

  if (linkedReservation) {
    return (
      <div className="space-y-3">
        <CandidateReservationGroup
          copy={copy}
          formatDate={formatDate}
          locale={locale}
          reservations={[linkedReservation]}
          title={copy.sections.linkedReservation}
        />
        {otherCandidates.length > 0 ? (
          <CandidateReservationGroup
            copy={copy}
            formatDate={formatDate}
            locale={locale}
            reservations={otherCandidates}
            title={formatCountLabel(
              copy.sections.otherAssociatedReservations,
              otherCandidates.length,
            )}
          />
        ) : null}
      </div>
    );
  }

  if (conversation.candidateReservations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-background px-4 py-10 text-center text-sm text-muted-foreground">
        {copy.empty.noAssociatedReservations}
      </div>
    );
  }

  if (conversation.candidateReservations.length > 1) {
    return (
      <CandidateReservationGrid
        copy={copy}
        formatDate={formatDate}
        locale={locale}
        reservations={conversation.candidateReservations}
      />
    );
  }

  return (
    <CandidateReservationGroup
      copy={copy}
      formatDate={formatDate}
      locale={locale}
      reservations={conversation.candidateReservations}
      title={copy.sections.possibleReservation}
    />
  );
}

function CandidateReservationGroup({
  copy,
  formatDate,
  locale,
  reservations,
  title,
}: Readonly<{
  copy: AdminWhatsAppCopy;
  formatDate: (value: string) => string;
  locale: Locale;
  reservations: readonly AdminWhatsAppReservationSummary[];
  title: string;
}>) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <CandidateReservationGrid
        copy={copy}
        formatDate={formatDate}
        locale={locale}
        reservations={reservations}
      />
    </section>
  );
}

function CandidateReservationGrid({
  copy,
  formatDate,
  locale,
  reservations,
}: Readonly<{
  copy: AdminWhatsAppCopy;
  formatDate: (value: string) => string;
  locale: Locale;
  reservations: readonly AdminWhatsAppReservationSummary[];
}>) {
  return (
    <div className="grid gap-2">
      {reservations.map((reservation) => (
        <CandidateReservationCard
          copy={copy}
          formatDate={formatDate}
          key={reservation.id}
          locale={locale}
          reservation={reservation}
        />
      ))}
    </div>
  );
}

function CandidateReservationCard({
  copy,
  formatDate,
  locale,
  reservation,
}: Readonly<{
  copy: AdminWhatsAppCopy;
  formatDate: (value: string) => string;
  locale: Locale;
  reservation: AdminWhatsAppReservationSummary;
}>) {
  return (
    <article className="rounded-lg border border-border bg-background px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {reservation.guestName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {candidatePropertyName(reservation, locale)}
          </p>
          <dl className="grid gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
            <div>
              <dt className="font-medium text-foreground">
                {copy.labels.checkIn}
              </dt>
              <dd>{formatDate(reservation.checkInDate)}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">
                {copy.labels.checkOut}
              </dt>
              <dd>{formatDate(reservation.checkOutDate)}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">
                {copy.labels.status}
              </dt>
              <dd>{reservationStatusLabel(copy, reservation.status)}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">
                {copy.labels.phone}
              </dt>
              <dd>{reservation.guestPhone ?? copy.labels.unavailable}</dd>
            </div>
          </dl>
        </div>
        <Button asChild className="shrink-0" size="sm" variant="outline">
          <Link href={`/admin/reservations/${reservation.id}`}>
            <ExternalLink aria-hidden="true" />
            {copy.actions.openReservation}
          </Link>
        </Button>
      </div>
    </article>
  );
}

function MessageBubble({
  copy,
  formatDateTime,
  message,
}: Readonly<{
  copy: AdminWhatsAppCopy;
  formatDateTime: (value: string | null) => string;
  message: AdminWhatsAppMessageSummary;
}>) {
  const inbound = message.direction === "INBOUND";

  return (
    <div className={`flex ${inbound ? "justify-start" : "justify-end"}`}>
      <article
        className={[
          "max-w-[44rem] rounded-lg border px-4 py-3 shadow-sm",
          inbound
            ? "border-border bg-background"
            : "border-primary/30 bg-primary text-primary-foreground",
        ].join(" ")}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant={inbound ? "secondary" : "default"}>
            {copy.directions[message.direction]}
          </Badge>
          <span className={inbound ? "text-muted-foreground" : ""}>
            {copy.messageStatuses[message.status]}
          </span>
          <span className={inbound ? "text-muted-foreground" : ""}>
            {formatDateTime(message.createdAt)}
          </span>
        </div>

        {message.body ? (
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">
            {message.body}
          </p>
        ) : null}

        {message.mediaCount > 0 ? (
          <div className="mt-3 rounded-md border border-border/70 bg-background/80 px-3 py-2 text-xs text-foreground">
            <div className="flex items-center gap-2 font-medium">
              <Paperclip aria-hidden="true" className="size-3.5" />
              <span>
                {copy.labels.media}: {message.mediaCount}
              </span>
            </div>
            <p className="mt-1 text-muted-foreground">
              {message.mediaItems
                .map(
                  (item) =>
                    item.contentType ?? copy.labels.unknownMediaType,
                )
                .join(", ")}
            </p>
          </div>
        ) : null}
      </article>
    </div>
  );
}
