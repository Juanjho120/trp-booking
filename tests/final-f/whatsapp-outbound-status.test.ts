import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  WhatsAppMessageDirection,
  WhatsAppMessageStatus,
} from "@prisma/client";

import {
  AdminWhatsAppError,
  sendAdminWhatsAppConversationMessage,
} from "@/lib/admin/whatsapp";
import {
  sendTwilioWhatsAppFreeformMessage,
  TwilioProviderError,
} from "@/lib/twilio/provider";
import {
  processTwilioWhatsAppStatusCallback,
  type WhatsAppStatusCallbackProcessingResult,
} from "@/lib/twilio/whatsapp-status";
import type { TwilioWebhookPayload } from "@/lib/twilio/provider";

import { test } from "./harness";

const ROOT = process.cwd();
const NOW = new Date("2026-09-22T12:00:00.000Z");
const ONE_HOUR_AGO = new Date(NOW.getTime() - 60 * 60 * 1000);
const EXACTLY_24H_AGO = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);
const WINDOW_EXPIRES = new Date(ONE_HOUR_AGO.getTime() + 24 * 60 * 60 * 1000);
const ENV = {
  TRP_ENVIRONMENT: "test",
  TWILIO_ACCOUNT_SID: ["A", "C", "1".repeat(32)].join(""),
  TWILIO_AUTH_TOKEN: "twilio-test-auth-token",
  TWILIO_WHATSAPP_FROM: "whatsapp:+15005550006",
  TWILIO_WEBHOOK_BASE_URL: "https://trp-booking.juantzun.dev",
} satisfies NodeJS.ProcessEnv;

type ConversationRecord = {
  id: string;
  guestPhoneE164: string;
  unreadCount: number;
  lastMessageAt: Date | null;
  lastInboundAt: Date | null;
  customerServiceWindowExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MessageRecord = {
  id: string;
  conversationId: string;
  direction: WhatsAppMessageDirection;
  status: WhatsAppMessageStatus;
  body: string | null;
  providerMessageSid: string | null;
  clientRequestId: string | null;
  mediaCount: number;
  mediaMetadata: unknown;
  attemptCount: number;
  lastAttemptAt: Date | null;
  processingStartedAt: Date | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  readAt: Date | null;
  failedAt: Date | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function payload(
  params: Record<string, string>,
): TwilioWebhookPayload {
  return {
    contentType: "form",
    params,
    bodyLength: new URLSearchParams(params).toString().length,
  };
}

function sid(suffix: string): string {
  return `SM${suffix.padStart(32, "0")}`;
}

function assertAdminWhatsAppError(code: string): (error: unknown) => boolean {
  return (error: unknown) =>
    error instanceof AdminWhatsAppError && error.code === code;
}

function prismaSerializationConflict(): Error & { code: string } {
  return Object.assign(new Error("Serializable transaction conflict"), {
    code: "P2034",
  });
}

class AsyncBarrier {
  private released = false;
  private waiting = 0;
  private readonly resolvers: Array<() => void> = [];

  constructor(private readonly expectedCount: number) {}

  async wait(): Promise<void> {
    if (this.released) {
      return;
    }

    this.waiting += 1;

    if (this.waiting >= this.expectedCount) {
      this.release();
      return;
    }

    await new Promise<void>((resolve) => {
      this.resolvers.push(resolve);
    });
  }

  private release(): void {
    this.released = true;

    for (const resolve of this.resolvers.splice(0)) {
      resolve();
    }
  }
}

class FakeFinalF5PrismaClient {
  conversations: ConversationRecord[] = [];
  messages: MessageRecord[] = [];
  inTransaction = false;
  serializationFailuresRemaining = 0;
  statusReadBarrier: AsyncBarrier | null = null;
  private activeTransactions = 0;
  private readonly messageVersions = new Map<string, number>();

  whatsAppConversation = {
    findUnique: async (args: unknown) => {
      const id = (args as { where?: { id?: string } }).where?.id;
      const conversation =
        this.conversations.find((item) => item.id === id) ?? null;

      return conversation;
    },
    updateMany: async (args: unknown) => {
      const input = args as {
        where: { id: string };
        data: { lastMessageAt?: Date; unreadCount?: number };
      };
      const conversation = this.conversations.find(
        (item) => item.id === input.where.id,
      );

      if (!conversation) {
        return { count: 0 };
      }

      if (input.data.lastMessageAt) {
        conversation.lastMessageAt = input.data.lastMessageAt;
      }

      if (typeof input.data.unreadCount === "number") {
        conversation.unreadCount = input.data.unreadCount;
      }

      conversation.updatedAt = NOW;

      return { count: 1 };
    },
  };

  whatsAppMessage = {
    findUnique: async (args: unknown) => {
      const where = (args as {
        where?: {
          id?: string;
          clientRequestId?: string;
          providerMessageSid?: string;
        };
      }).where;
      const message =
        this.messages.find(
          (item) =>
            item.id === where?.id ||
            item.clientRequestId === where?.clientRequestId ||
            item.providerMessageSid === where?.providerMessageSid,
        ) ?? null;

      return message ? { ...message } : null;
    },
    create: async (args: unknown) => {
      const data = (args as {
        data: {
          conversationId: string;
          direction: WhatsAppMessageDirection;
          status: WhatsAppMessageStatus;
          body?: string | null;
          clientRequestId?: string | null;
          mediaCount?: number;
          createdAt?: Date;
          updatedAt?: Date;
        };
      }).data;

      if (
        data.clientRequestId &&
        this.messages.some(
          (message) => message.clientRequestId === data.clientRequestId,
        )
      ) {
        throw {
          code: "P2002",
          meta: { target: ["client_request_id"] },
        };
      }

      const message: MessageRecord = {
        id: `message-${this.messages.length + 1}`,
        conversationId: data.conversationId,
        direction: data.direction,
        status: data.status,
        body: data.body ?? null,
        providerMessageSid: null,
        clientRequestId: data.clientRequestId ?? null,
        mediaCount: data.mediaCount ?? 0,
        mediaMetadata: null,
        attemptCount: 0,
        lastAttemptAt: null,
        processingStartedAt: null,
        sentAt: null,
        deliveredAt: null,
        readAt: null,
        failedAt: null,
        errorCode: null,
        errorMessage: null,
        createdAt: data.createdAt ?? NOW,
        updatedAt: data.updatedAt ?? NOW,
      };

      this.messages.push(message);
      this.messageVersions.set(message.id, 0);

      return { ...message };
    },
    updateMany: async (args: unknown) => {
      const input = args as {
        where: {
          id?: string;
          status?: WhatsAppMessageStatus;
          providerMessageSid?: null;
        };
        data: {
          status?: WhatsAppMessageStatus;
          attemptCount?: { increment: number };
          lastAttemptAt?: Date;
          processingStartedAt?: Date | null;
        };
      };
      const matching = this.messages.filter(
        (message) =>
          (!input.where.id || message.id === input.where.id) &&
          (!input.where.status || message.status === input.where.status) &&
          (input.where.providerMessageSid !== null ||
            message.providerMessageSid === null),
      );

      for (const message of matching) {
        if (input.data.status) {
          message.status = input.data.status;
        }

        if (input.data.attemptCount) {
          message.attemptCount += input.data.attemptCount.increment;
        }

        if (input.data.lastAttemptAt) {
          message.lastAttemptAt = input.data.lastAttemptAt;
        }

        if ("processingStartedAt" in input.data) {
          message.processingStartedAt = input.data.processingStartedAt ?? null;
        }

        this.messageVersions.set(
          message.id,
          (this.messageVersions.get(message.id) ?? 0) + 1,
        );
      }

      return { count: matching.length };
    },
    update: async (args: unknown) => {
      const input = args as {
        where: { id: string };
        data: Partial<MessageRecord>;
      };
      const message = this.messages.find((item) => item.id === input.where.id);
      assert.ok(message, `Missing message ${input.where.id}`);

      Object.assign(message, input.data, { updatedAt: NOW });
      this.messageVersions.set(
        message.id,
        (this.messageVersions.get(message.id) ?? 0) + 1,
      );

      return { ...message };
    },
  };

  async $transaction<T>(
    run: (transaction: this) => Promise<T>,
  ): Promise<T> {
    if (this.serializationFailuresRemaining > 0) {
      this.serializationFailuresRemaining -= 1;
      throw prismaSerializationConflict();
    }

    const transaction = this.createTransactionClient();
    this.activeTransactions += 1;
    this.inTransaction = this.activeTransactions > 0;

    try {
      return await run(transaction as this);
    } finally {
      this.activeTransactions -= 1;
      this.inTransaction = this.activeTransactions > 0;
    }
  }

  private createTransactionClient() {
    const readVersions = new Map<string, number>();

    return {
      whatsAppConversation: this.whatsAppConversation,
      whatsAppMessage: {
        findUnique: async (args: unknown) => {
          const message = await this.whatsAppMessage.findUnique(args);

          if (message) {
            readVersions.set(
              message.id,
              this.messageVersions.get(message.id) ?? 0,
            );

            const where = (args as {
              where?: { providerMessageSid?: string };
            }).where;

            if (where?.providerMessageSid) {
              await this.statusReadBarrier?.wait();
            }
          }

          return message;
        },
        create: this.whatsAppMessage.create,
        updateMany: this.whatsAppMessage.updateMany,
        update: async (args: unknown) => {
          const id = (args as { where: { id: string } }).where.id;
          const readVersion = readVersions.get(id);

          if (
            readVersion !== undefined &&
            readVersion !== (this.messageVersions.get(id) ?? 0)
          ) {
            throw prismaSerializationConflict();
          }

          return this.whatsAppMessage.update(args);
        },
      },
    };
  }

  addConversation(
    input: Readonly<{
      id: string;
      guestPhoneE164?: string;
      lastInboundAt?: Date | null;
    }>,
  ): void {
    this.conversations.push({
      id: input.id,
      guestPhoneE164: input.guestPhoneE164 ?? "+50255551234",
      unreadCount: 3,
      lastMessageAt: null,
      lastInboundAt: input.lastInboundAt ?? ONE_HOUR_AGO,
      customerServiceWindowExpiresAt: WINDOW_EXPIRES,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  addMessage(input: Partial<MessageRecord> & { id: string }): void {
    const message = {
      id: input.id,
      conversationId: input.conversationId ?? "conversation-1",
      direction: input.direction ?? WhatsAppMessageDirection.OUTBOUND,
      status: input.status ?? WhatsAppMessageStatus.QUEUED,
      body: input.body ?? "mensaje",
      providerMessageSid: input.providerMessageSid ?? null,
      clientRequestId: input.clientRequestId ?? null,
      mediaCount: input.mediaCount ?? 0,
      mediaMetadata: input.mediaMetadata ?? null,
      attemptCount: input.attemptCount ?? 0,
      lastAttemptAt: input.lastAttemptAt ?? null,
      processingStartedAt: input.processingStartedAt ?? null,
      sentAt: input.sentAt ?? null,
      deliveredAt: input.deliveredAt ?? null,
      readAt: input.readAt ?? null,
      failedAt: input.failedAt ?? null,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null,
      createdAt: input.createdAt ?? NOW,
      updatedAt: input.updatedAt ?? NOW,
    };

    this.messages.push(message);
    this.messageVersions.set(message.id, 0);
  }
}

function twilioClient(
  fake: FakeFinalF5PrismaClient,
  response: Readonly<{ sid?: string | null; status?: string | null }>,
  calls: unknown[],
) {
  return {
    messages: {
      async create(input: unknown) {
        assert.equal(fake.inTransaction, false);
        calls.push(input);
        return response;
      },
    },
  };
}

async function processConcurrentStatusCallbacks(
  fake: FakeFinalF5PrismaClient,
  providerMessageSid: string,
  events: ReadonlyArray<
    Readonly<{
      status: string;
      now: Date;
      errorCode?: string;
    }>
  >,
): Promise<readonly WhatsAppStatusCallbackProcessingResult[]> {
  fake.statusReadBarrier = new AsyncBarrier(events.length);

  try {
    return await Promise.all(
      events.map((event) =>
        processTwilioWhatsAppStatusCallback(
          payload({
            MessageSid: providerMessageSid,
            MessageStatus: event.status,
            ...(event.errorCode ? { ErrorCode: event.errorCode } : {}),
          }),
          { now: event.now, prismaClient: fake as never },
        ),
      ),
    );
  } finally {
    fake.statusReadBarrier = null;
  }
}

test("F.5 sends admin free-form replies to the server-owned guest phone only", async () => {
  const fake = new FakeFinalF5PrismaClient();
  const calls: unknown[] = [];
  fake.addConversation({ id: "conversation-1" });

  const result = await sendAdminWhatsAppConversationMessage(
    {
      conversationId: "conversation-1",
      body: "  Hola\n  huésped  ",
      clientRequestId: "reply-1",
    },
    { email: "admin@example.com", name: "Admin" },
    {
      now: NOW,
      prismaClient: fake as never,
      source: ENV,
      twilioClient: twilioClient(
        fake,
        { sid: sid("101"), status: "accepted" },
        calls,
      ) as never,
    },
  );

  assert.equal(result.deliveryAttempted, true);
  assert.equal(result.message.status, WhatsAppMessageStatus.QUEUED);
  assert.equal(fake.messages.length, 1);
  assert.equal(fake.messages[0].body, "Hola\n  huésped");
  assert.equal(fake.messages[0].clientRequestId, "reply-1");
  assert.equal(fake.messages[0].providerMessageSid, sid("101"));
  assert.equal(fake.messages[0].attemptCount, 1);
  assert.equal(fake.conversations[0].unreadCount, 3);
  assert.equal(fake.conversations[0].lastInboundAt?.toISOString(), ONE_HOUR_AGO.toISOString());
  assert.equal(
    fake.conversations[0].customerServiceWindowExpiresAt?.toISOString(),
    WINDOW_EXPIRES.toISOString(),
  );
  assert.equal(fake.conversations[0].lastMessageAt?.toISOString(), NOW.toISOString());
  assert.deepEqual(calls[0], {
    from: "whatsapp:+15005550006",
    to: "whatsapp:+50255551234",
    body: "Hola\n  huésped",
    statusCallback: "https://trp-booking.juantzun.dev/api/twilio/whatsapp/status",
  });
});

test("F.5 reuses identical clientRequestId submissions without a second Twilio send", async () => {
  const fake = new FakeFinalF5PrismaClient();
  const calls: unknown[] = [];
  fake.addConversation({ id: "conversation-1" });
  const options = {
    now: NOW,
    prismaClient: fake as never,
    source: ENV,
    twilioClient: twilioClient(
      fake,
      { sid: sid("102"), status: "sent" },
      calls,
    ) as never,
  };

  await sendAdminWhatsAppConversationMessage(
    {
      conversationId: "conversation-1",
      body: "Mismo mensaje",
      clientRequestId: "reply-idempotent",
    },
    { email: "admin@example.com", name: "Admin" },
    options,
  );
  const replay = await sendAdminWhatsAppConversationMessage(
    {
      conversationId: "conversation-1",
      body: "Mismo mensaje",
      clientRequestId: "reply-idempotent",
    },
    { email: "admin@example.com", name: "Admin" },
    options,
  );

  assert.equal(fake.messages.length, 1);
  assert.equal(calls.length, 1);
  assert.equal(replay.deliveryAttempted, false);
  assert.equal(replay.message.status, WhatsAppMessageStatus.SENT);
});

test("F.5 safely reclaims an existing PENDING clientRequestId intent", async () => {
  const fake = new FakeFinalF5PrismaClient();
  const calls: unknown[] = [];
  fake.addConversation({ id: "conversation-1" });
  fake.addMessage({
    id: "message-pending-replay",
    conversationId: "conversation-1",
    status: WhatsAppMessageStatus.PENDING,
    body: "Mensaje pendiente",
    clientRequestId: "reply-pending-replay",
    providerMessageSid: null,
  });

  const result = await sendAdminWhatsAppConversationMessage(
    {
      conversationId: "conversation-1",
      body: "Mensaje pendiente",
      clientRequestId: "reply-pending-replay",
    },
    { email: "admin@example.com", name: "Admin" },
    {
      now: NOW,
      prismaClient: fake as never,
      source: ENV,
      twilioClient: twilioClient(
        fake,
        { sid: sid("106"), status: "sent" },
        calls,
      ) as never,
    },
  );

  assert.equal(result.deliveryAttempted, true);
  assert.equal(result.message.status, WhatsAppMessageStatus.SENT);
  assert.equal(fake.messages.length, 1);
  assert.equal(fake.messages[0].providerMessageSid, sid("106"));
  assert.equal(fake.messages[0].attemptCount, 1);
  assert.equal(calls.length, 1);
});

test("F.5 concurrent same-ID PENDING replays call Twilio exactly once", async () => {
  const fake = new FakeFinalF5PrismaClient();
  const calls: unknown[] = [];
  fake.addConversation({ id: "conversation-1" });
  fake.addMessage({
    id: "message-pending-concurrent",
    conversationId: "conversation-1",
    status: WhatsAppMessageStatus.PENDING,
    body: "Mensaje concurrente",
    clientRequestId: "reply-pending-concurrent",
    providerMessageSid: null,
  });
  const options = {
    now: NOW,
    prismaClient: fake as never,
    source: ENV,
    twilioClient: twilioClient(
      fake,
      { sid: sid("107"), status: "queued" },
      calls,
    ) as never,
  };

  const results = await Promise.all([
    sendAdminWhatsAppConversationMessage(
      {
        conversationId: "conversation-1",
        body: "Mensaje concurrente",
        clientRequestId: "reply-pending-concurrent",
      },
      { email: "admin@example.com", name: "Admin" },
      options,
    ),
    sendAdminWhatsAppConversationMessage(
      {
        conversationId: "conversation-1",
        body: "Mensaje concurrente",
        clientRequestId: "reply-pending-concurrent",
      },
      { email: "admin@example.com", name: "Admin" },
      options,
    ),
  ]);

  assert.equal(calls.length, 1);
  assert.equal(fake.messages.length, 1);
  assert.equal(fake.messages[0].providerMessageSid, sid("107"));
  assert.equal(fake.messages[0].attemptCount, 1);
  assert.equal(
    results.filter((result) => result.deliveryAttempted).length,
    1,
  );
});

test("F.5 same-ID replay does not resend PROCESSING or terminal provider states", async () => {
  const statuses = [
    WhatsAppMessageStatus.PROCESSING,
    WhatsAppMessageStatus.QUEUED,
    WhatsAppMessageStatus.SENT,
    WhatsAppMessageStatus.DELIVERED,
    WhatsAppMessageStatus.READ,
    WhatsAppMessageStatus.FAILED,
    WhatsAppMessageStatus.UNDELIVERED,
  ];

  for (const status of statuses) {
    const fake = new FakeFinalF5PrismaClient();
    const calls: unknown[] = [];
    fake.addConversation({ id: "conversation-1" });
    fake.addMessage({
      id: `message-${status}`,
      conversationId: "conversation-1",
      status,
      body: "Mensaje ya procesado",
      clientRequestId: `reply-${status}`,
      providerMessageSid:
        status === WhatsAppMessageStatus.PROCESSING ? null : sid(`9${statuses.indexOf(status)}`),
    });

    const result = await sendAdminWhatsAppConversationMessage(
      {
        conversationId: "conversation-1",
        body: "Mensaje ya procesado",
        clientRequestId: `reply-${status}`,
      },
      { email: "admin@example.com", name: "Admin" },
      {
        now: NOW,
        prismaClient: fake as never,
        source: ENV,
        twilioClient: twilioClient(
          fake,
          { sid: sid("108"), status: "queued" },
          calls,
        ) as never,
      },
    );

    assert.equal(result.deliveryAttempted, false);
    assert.equal(result.message.status, status);
    assert.equal(calls.length, 0);
  }
});

test("F.5 rejects reused clientRequestId with different conversation or body", async () => {
  const fake = new FakeFinalF5PrismaClient();
  fake.addConversation({ id: "conversation-1" });
  fake.addConversation({ id: "conversation-2" });
  const options = {
    now: NOW,
    prismaClient: fake as never,
    source: ENV,
    twilioClient: twilioClient(fake, { sid: sid("103"), status: "queued" }, []) as never,
  };

  await sendAdminWhatsAppConversationMessage(
    {
      conversationId: "conversation-1",
      body: "Contenido original",
      clientRequestId: "reply-conflict",
    },
    { email: "admin@example.com", name: "Admin" },
    options,
  );

  await assert.rejects(
    () =>
      sendAdminWhatsAppConversationMessage(
        {
          conversationId: "conversation-1",
          body: "Contenido distinto",
          clientRequestId: "reply-conflict",
        },
        { email: "admin@example.com", name: "Admin" },
        options,
      ),
    assertAdminWhatsAppError("ADMIN_WHATSAPP_IDEMPOTENCY_CONFLICT"),
  );
  await assert.rejects(
    () =>
      sendAdminWhatsAppConversationMessage(
        {
          conversationId: "conversation-2",
          body: "Contenido original",
          clientRequestId: "reply-conflict",
        },
        { email: "admin@example.com", name: "Admin" },
        options,
      ),
    assertAdminWhatsAppError("ADMIN_WHATSAPP_IDEMPOTENCY_CONFLICT"),
  );
});

test("F.5 blocks free-form replies exactly at the 24-hour boundary", async () => {
  const fake = new FakeFinalF5PrismaClient();
  fake.addConversation({
    id: "conversation-closed",
    lastInboundAt: EXACTLY_24H_AGO,
  });

  await assert.rejects(
    () =>
      sendAdminWhatsAppConversationMessage(
        {
          conversationId: "conversation-closed",
          body: "Mensaje tardío",
          clientRequestId: "reply-closed",
        },
        { email: "admin@example.com", name: "Admin" },
        {
          now: NOW,
          prismaClient: fake as never,
          source: ENV,
          twilioClient: twilioClient(fake, { sid: sid("104") }, []) as never,
        },
      ),
    assertAdminWhatsAppError("ADMIN_WHATSAPP_FREEFORM_WINDOW_CLOSED"),
  );

  assert.equal(fake.messages.length, 0);
});

test("F.5 keeps durable FAILED outbound rows when Twilio does not return a valid MessageSid", async () => {
  const fake = new FakeFinalF5PrismaClient();
  fake.addConversation({ id: "conversation-1" });

  const result = await sendAdminWhatsAppConversationMessage(
    {
      conversationId: "conversation-1",
      body: "Mensaje con fallo provider",
      clientRequestId: "reply-provider-failure",
    },
    { email: "admin@example.com", name: "Admin" },
    {
      now: NOW,
      prismaClient: fake as never,
      source: ENV,
      twilioClient: twilioClient(
        fake,
        { sid: "not-a-valid-sid", status: "queued" },
        [],
      ) as never,
    },
  );

  assert.equal(result.deliveryAttempted, true);
  assert.equal(result.message.status, WhatsAppMessageStatus.FAILED);
  assert.equal(fake.messages.length, 1);
  assert.equal(fake.messages[0].providerMessageSid, null);
  assert.equal(fake.messages[0].errorCode, "TWILIO_PROVIDER_UNEXPECTED_ERROR");
  assert.equal(
    fake.messages[0].errorMessage,
    "The Twilio provider returned an unexpected error.",
  );
});

test("F.5 provider helper validates body length and provider MessageSid", async () => {
  await assert.rejects(
    () =>
      sendTwilioWhatsAppFreeformMessage({
        to: "+50255551234",
        body: "x".repeat(1601),
        source: ENV,
        client: twilioClient(
          new FakeFinalF5PrismaClient(),
          { sid: sid("105") },
          [],
        ) as never,
      }),
    (error) =>
      error instanceof TwilioProviderError &&
      error.code === "TWILIO_PROVIDER_INVALID_REQUEST",
  );

  await assert.rejects(
    () =>
      sendTwilioWhatsAppFreeformMessage({
        to: "+50255551234",
        body: "Mensaje válido",
        source: ENV,
        client: twilioClient(
          new FakeFinalF5PrismaClient(),
          { sid: "SMnotvalid", status: "queued" },
          [],
        ) as never,
      }),
    (error) =>
      error instanceof TwilioProviderError &&
      error.code === "TWILIO_PROVIDER_UNEXPECTED_ERROR",
  );
});

test("F.5 status callbacks ignore unknown and inbound provider SIDs", async () => {
  const fake = new FakeFinalF5PrismaClient();
  fake.addMessage({
    id: "message-inbound",
    direction: WhatsAppMessageDirection.INBOUND,
    status: WhatsAppMessageStatus.RECEIVED,
    providerMessageSid: sid("201"),
  });

  assert.deepEqual(
    await processTwilioWhatsAppStatusCallback(
      payload({
        MessageSid: sid("200"),
        MessageStatus: "delivered",
      }),
      { now: NOW, prismaClient: fake as never },
    ),
    { kind: "ignored", reason: "UNKNOWN_MESSAGE_SID" },
  );
  assert.deepEqual(
    await processTwilioWhatsAppStatusCallback(
      payload({
        MessageSid: sid("201"),
        MessageStatus: "delivered",
      }),
      { now: NOW, prismaClient: fake as never },
    ),
    { kind: "ignored", reason: "INBOUND_MESSAGE" },
  );
});

test("F.5 status callbacks converge success states without regressions", async () => {
  const fake = new FakeFinalF5PrismaClient();
  fake.addMessage({
    id: "message-status",
    status: WhatsAppMessageStatus.QUEUED,
    providerMessageSid: sid("301"),
  });

  const statuses = ["sent", "delivered", "read", "sent"];
  const results: WhatsAppStatusCallbackProcessingResult[] = [];

  for (const status of statuses) {
    results.push(
      await processTwilioWhatsAppStatusCallback(
        payload({
          MessageSid: sid("301"),
          MessageStatus: status,
        }),
        { now: NOW, prismaClient: fake as never },
      ),
    );
  }

  assert.equal(results.every((result) => result.kind === "processed"), true);
  assert.equal(fake.messages[0].status, WhatsAppMessageStatus.READ);
  assert.equal(fake.messages[0].sentAt?.toISOString(), NOW.toISOString());
  assert.equal(fake.messages[0].deliveredAt?.toISOString(), NOW.toISOString());
  assert.equal(fake.messages[0].readAt?.toISOString(), NOW.toISOString());
});

test("F.5 concurrent SENT and DELIVERED callbacks converge to DELIVERED", async () => {
  const fake = new FakeFinalF5PrismaClient();
  fake.addMessage({
    id: "message-concurrent-delivered",
    status: WhatsAppMessageStatus.QUEUED,
    providerMessageSid: sid("302"),
  });

  const results = await processConcurrentStatusCallbacks(fake, sid("302"), [
    { status: "sent", now: NOW },
    { status: "delivered", now: new Date(NOW.getTime() + 1000) },
  ]);

  assert.equal(results.every((result) => result.kind === "processed"), true);
  assert.equal(fake.messages[0].status, WhatsAppMessageStatus.DELIVERED);
  assert.equal(fake.messages[0].sentAt?.toISOString(), NOW.toISOString());
  assert.equal(
    fake.messages[0].deliveredAt?.toISOString(),
    new Date(NOW.getTime() + 1000).toISOString(),
  );
});

test("F.5 concurrent SENT and READ callbacks converge to READ", async () => {
  const fake = new FakeFinalF5PrismaClient();
  fake.addMessage({
    id: "message-concurrent-read-from-sent",
    status: WhatsAppMessageStatus.QUEUED,
    providerMessageSid: sid("303"),
  });

  await processConcurrentStatusCallbacks(fake, sid("303"), [
    { status: "sent", now: NOW },
    { status: "read", now: new Date(NOW.getTime() + 1000) },
  ]);

  assert.equal(fake.messages[0].status, WhatsAppMessageStatus.READ);
  assert.equal(fake.messages[0].sentAt?.toISOString(), NOW.toISOString());
  assert.equal(
    fake.messages[0].readAt?.toISOString(),
    new Date(NOW.getTime() + 1000).toISOString(),
  );
});

test("F.5 concurrent DELIVERED and READ callbacks converge to READ", async () => {
  const fake = new FakeFinalF5PrismaClient();
  fake.addMessage({
    id: "message-concurrent-read-from-delivered",
    status: WhatsAppMessageStatus.SENT,
    providerMessageSid: sid("304"),
  });

  await processConcurrentStatusCallbacks(fake, sid("304"), [
    { status: "delivered", now: NOW },
    { status: "read", now: new Date(NOW.getTime() + 1000) },
  ]);

  assert.equal(fake.messages[0].status, WhatsAppMessageStatus.READ);
  assert.equal(fake.messages[0].deliveredAt?.toISOString(), NOW.toISOString());
  assert.equal(
    fake.messages[0].readAt?.toISOString(),
    new Date(NOW.getTime() + 1000).toISOString(),
  );
});

test("F.5 concurrent duplicate DELIVERED callbacks preserve first observed timestamp", async () => {
  const fake = new FakeFinalF5PrismaClient();
  const firstObservedAt = NOW;
  const laterObservedAt = new Date(NOW.getTime() + 5000);
  fake.addMessage({
    id: "message-concurrent-duplicate-delivered",
    status: WhatsAppMessageStatus.QUEUED,
    providerMessageSid: sid("305"),
  });

  await processConcurrentStatusCallbacks(fake, sid("305"), [
    { status: "delivered", now: firstObservedAt },
    { status: "delivered", now: laterObservedAt },
  ]);
  const committedDeliveredAt = fake.messages[0].deliveredAt?.toISOString();

  assert.equal(fake.messages[0].status, WhatsAppMessageStatus.DELIVERED);
  assert.equal(
    [firstObservedAt.toISOString(), laterObservedAt.toISOString()].includes(
      committedDeliveredAt ?? "",
    ),
    true,
  );

  await processTwilioWhatsAppStatusCallback(
    payload({
      MessageSid: sid("305"),
      MessageStatus: "delivered",
    }),
    {
      now: new Date(NOW.getTime() + 10000),
      prismaClient: fake as never,
    },
  );

  assert.equal(
    fake.messages[0].deliveredAt?.toISOString(),
    committedDeliveredAt,
  );
});

test("F.5 status callbacks keep failure terminal and store only safe error evidence", async () => {
  const fake = new FakeFinalF5PrismaClient();
  fake.addMessage({
    id: "message-failed",
    status: WhatsAppMessageStatus.QUEUED,
    providerMessageSid: sid("401"),
  });

  await processTwilioWhatsAppStatusCallback(
    payload({
      MessageSid: sid("401"),
      MessageStatus: "failed",
      ErrorCode: "30005",
      ErrorMessage: "raw provider text must not persist",
    }),
    { now: NOW, prismaClient: fake as never },
  );
  await processTwilioWhatsAppStatusCallback(
    payload({
      MessageSid: sid("401"),
      MessageStatus: "delivered",
    }),
    { now: NOW, prismaClient: fake as never },
  );

  assert.equal(fake.messages[0].status, WhatsAppMessageStatus.FAILED);
  assert.equal(fake.messages[0].deliveredAt, null);
  assert.equal(fake.messages[0].errorCode, "30005");
  assert.equal(
    fake.messages[0].errorMessage,
    "Twilio reported WhatsApp message delivery as failed.",
  );
  assert.equal(
    JSON.stringify(fake.messages[0]).includes("raw provider text must not persist"),
    false,
  );
});

test("F.5 concurrent FAILED and ordinary success callbacks preserve terminal failure", async () => {
  const fake = new FakeFinalF5PrismaClient();
  fake.addMessage({
    id: "message-concurrent-failed",
    status: WhatsAppMessageStatus.QUEUED,
    providerMessageSid: sid("402"),
  });

  await processConcurrentStatusCallbacks(fake, sid("402"), [
    { status: "failed", now: NOW, errorCode: "30005" },
    { status: "sent", now: new Date(NOW.getTime() + 1000) },
  ]);

  assert.equal(fake.messages[0].status, WhatsAppMessageStatus.FAILED);
  assert.equal(fake.messages[0].errorCode, "30005");

  await processTwilioWhatsAppStatusCallback(
    payload({
      MessageSid: sid("402"),
      MessageStatus: "delivered",
    }),
    {
      now: new Date(NOW.getTime() + 2000),
      prismaClient: fake as never,
    },
  );

  assert.equal(fake.messages[0].status, WhatsAppMessageStatus.FAILED);
  assert.equal(fake.messages[0].deliveredAt, null);
});

test("F.5 status callback retries serialization conflicts and converges", async () => {
  const fake = new FakeFinalF5PrismaClient();
  fake.serializationFailuresRemaining = 1;
  fake.addMessage({
    id: "message-retry-converges",
    status: WhatsAppMessageStatus.QUEUED,
    providerMessageSid: sid("403"),
  });

  const result = await processTwilioWhatsAppStatusCallback(
    payload({
      MessageSid: sid("403"),
      MessageStatus: "delivered",
    }),
    { now: NOW, prismaClient: fake as never },
  );

  assert.deepEqual(result, {
    kind: "processed",
    messageId: "message-retry-converges",
    status: WhatsAppMessageStatus.DELIVERED,
  });
  assert.equal(fake.serializationFailuresRemaining, 0);
  assert.equal(fake.messages[0].status, WhatsAppMessageStatus.DELIVERED);
});

test("F.5 status callback retry exhaustion propagates database failure", async () => {
  const fake = new FakeFinalF5PrismaClient();
  fake.serializationFailuresRemaining = 3;
  fake.addMessage({
    id: "message-retry-exhausted",
    status: WhatsAppMessageStatus.QUEUED,
    providerMessageSid: sid("404"),
  });

  await assert.rejects(
    () =>
      processTwilioWhatsAppStatusCallback(
        payload({
          MessageSid: sid("404"),
          MessageStatus: "delivered",
        }),
        { now: NOW, prismaClient: fake as never },
      ),
    (error) =>
      typeof error === "object" &&
      error !== null &&
      (error as { code?: unknown }).code === "P2034",
  );

  assert.equal(fake.serializationFailuresRemaining, 0);
  assert.equal(fake.messages[0].status, WhatsAppMessageStatus.QUEUED);
});

test("F.5 status callbacks support EventType read compatibility", async () => {
  const fake = new FakeFinalF5PrismaClient();
  fake.addMessage({
    id: "message-read",
    status: WhatsAppMessageStatus.DELIVERED,
    providerMessageSid: sid("501"),
  });

  await processTwilioWhatsAppStatusCallback(
    payload({
      MessageSid: sid("501"),
      EventType: "READ",
    }),
    { now: NOW, prismaClient: fake as never },
  );

  assert.equal(fake.messages[0].status, WhatsAppMessageStatus.READ);
  assert.equal(fake.messages[0].readAt?.toISOString(), NOW.toISOString());
});

test("F.5 reply composer owns clientRequestId across ambiguous logical retries", () => {
  const component = read("features/admin/components/admin-whatsapp-page.tsx");

  assert.equal(component.includes("conversationId: string,"), true);
  assert.equal(component.includes("body: string,"), true);
  assert.equal(component.includes("clientRequestId: string,"), true);
  assert.equal(component.includes("PendingLogicalReplyRequest"), true);
  assert.equal(
    component.includes(
      "pendingLogicalRequest?.normalizedBody === normalizedBody",
    ),
    true,
  );
  assert.equal(
    component.includes(
      "onSendMessage(\n      conversation.id,\n      body,\n      logicalRequest.clientRequestId",
    ),
    true,
  );
  assert.equal(component.includes("setPendingLogicalRequest(null);"), true);
  assert.equal(component.includes("setPendingLogicalRequest(logicalRequest);"), true);
  assert.ok(
    component.indexOf("clientRequestId: createClientRequestId()") >
      component.indexOf("function ReplyComposer"),
  );
  assert.ok(
    component.indexOf("clientRequestId,") <
      component.indexOf("function ReplyComposer"),
  );
});

test("F.5 source keeps outbound reply narrow and avoids raw callback persistence", () => {
  const adminRoute = read(
    "app/api/admin/whatsapp/conversations/[conversationId]/messages/route.ts",
  );
  const statusService = read("lib/twilio/whatsapp-status.ts");
  const component = read("features/admin/components/admin-whatsapp-page.tsx");
  const vercel = JSON.parse(read("vercel.json")) as unknown;

  assert.equal(adminRoute.includes("sendAdminWhatsAppConversationMessage"), true);
  assert.equal(adminRoute.includes("to:"), false);
  assert.equal(statusService.includes("ChannelStatusMessage"), false);
  assert.equal(statusService.includes("rawPayload"), false);
  assert.equal(statusService.includes("ErrorMessage"), false);
  assert.equal(component.includes("template"), false);
  assert.deepEqual(vercel, { crons: [] });
});
