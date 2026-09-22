import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import twilio from "twilio";

import { POST as statusPost } from "@/app/api/twilio/whatsapp/status/route";
import {
  getAdminWhatsAppPage,
  markAdminWhatsAppConversationRead,
} from "@/lib/admin/whatsapp";
import {
  normalizeReservationGuestPhone,
  processInboundWhatsAppWebhook,
} from "@/lib/twilio/inbound-whatsapp";
import {
  type TwilioWebhookPayload,
  validateTwilioWebhookRequest,
} from "@/lib/twilio/provider";

import { test } from "./harness";

const ROOT = process.cwd();
const AUTH_TOKEN = "twilio-test-auth-token";
const ENV = {
  TRP_ENVIRONMENT: "test",
  TWILIO_ACCOUNT_SID: ["A", "C", "1".repeat(32)].join(""),
  TWILIO_AUTH_TOKEN: AUTH_TOKEN,
  TWILIO_WHATSAPP_FROM: "whatsapp:+15005550006",
  TWILIO_WEBHOOK_BASE_URL: "https://trp-booking.juantzun.dev",
} satisfies NodeJS.ProcessEnv;
const NOW = new Date("2026-09-22T12:00:00.000Z");
const WINDOW_EXPIRES = new Date("2026-09-23T12:00:00.000Z");

type ConversationRecord = {
  id: string;
  guestPhoneE164: string;
  reservationId: string | null;
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
  direction: string;
  status: string;
  body: string | null;
  providerMessageSid: string | null;
  mediaCount: number;
  mediaMetadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type ReservationRecord = {
  id: string;
  guestName: string;
  guestPhone: string | null;
  property: {
    id: string;
    nameEs: string;
    nameEn: string;
  };
};

type StaffRecord = {
  id: string;
  phoneE164: string;
  active: boolean;
};

function read(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function firstString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function p2002(target: string | readonly string[]) {
  return {
    code: "P2002",
    meta: { target },
  };
}

function serializableConflict() {
  return { code: "P2034" };
}

function messageSid(suffix: string): string {
  return `SM${suffix.padStart(32, "0")}`;
}

function makePayload(
  overrides: Record<string, string | undefined> = {},
): TwilioWebhookPayload {
  const params: Record<string, string> = {
    MessageSid: "SM11111111111111111111111111111111",
    From: "whatsapp:+15005550100",
    To: "whatsapp:+15005550006",
    Body: "Hola, necesito ayuda con mi reserva.",
    NumMedia: "0",
  };

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete params[key];
    } else {
      params[key] = value;
    }
  }

  return {
    contentType: "form",
    params,
    bodyLength: new URLSearchParams(params).toString().length,
  };
}

function formRequest(
  url: string,
  body: URLSearchParams,
  signatureUrl: string,
  signature = twilio.getExpectedTwilioSignature(
    AUTH_TOKEN,
    signatureUrl,
    Object.fromEntries(body.entries()),
  ),
): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-twilio-signature": signature,
    },
    body: body.toString(),
  });
}

async function withTwilioRouteEnv<T>(run: () => Promise<T>): Promise<T> {
  const originalEnv = {
    TRP_ENVIRONMENT: process.env.TRP_ENVIRONMENT,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM,
    TWILIO_WEBHOOK_BASE_URL: process.env.TWILIO_WEBHOOK_BASE_URL,
  };

  Object.assign(process.env, ENV);

  try {
    return await run();
  } finally {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

class FakeWhatsAppPrismaClient {
  conversations: ConversationRecord[] = [];
  messages: MessageRecord[] = [];
  reservations: ReservationRecord[] = [];
  staff: StaffRecord[] = [];
  staffAlertCreateCalls = 0;
  uniqueConflictForSid: string | null = null;
  conversationCreateUniqueConflictForPhoneOnce: string | null = null;
  serializableConflictsRemaining = 0;
  transactionAttempts = 0;

  staffWhatsAppRecipient = {
    findFirst: async (args: unknown) => {
      const where = (args as { where?: { phoneE164?: string; active?: boolean } })
        .where;
      return (
        this.staff.find(
          (recipient) =>
            recipient.phoneE164 === where?.phoneE164 &&
            recipient.active === where?.active,
        ) ?? null
      );
    },
  };

  reservation = {
    findMany: async () =>
      this.reservations.map((reservation) => ({
        id: reservation.id,
        guestPhone: reservation.guestPhone,
      })),
  };

  whatsAppConversation = {
    count: async () => this.conversations.length,
    findMany: async (args: unknown) => {
      const pagination = args as { skip?: number; take?: number };
      return this.conversations
        .slice()
        .sort((left, right) => {
          const leftTime = left.lastMessageAt?.getTime() ?? 0;
          const rightTime = right.lastMessageAt?.getTime() ?? 0;
          return rightTime - leftTime || left.id.localeCompare(right.id);
        })
        .slice(
          pagination.skip ?? 0,
          (pagination.skip ?? 0) + (pagination.take ?? this.conversations.length),
        )
        .map((conversation) => this.toConversationSelect(conversation));
    },
    findUnique: async (args: unknown) => {
      const where = (args as {
        where?: { id?: string; guestPhoneE164?: string };
      }).where;
      const conversation = this.conversations.find(
        (item) =>
          item.id === where?.id || item.guestPhoneE164 === where?.guestPhoneE164,
      );

      return conversation ? this.toConversationSelect(conversation) : null;
    },
    create: async (args: unknown) => {
      const data = (args as {
        data: { guestPhoneE164: string; reservationId?: string };
      }).data;
      const existing = this.conversations.find(
        (conversation) => conversation.guestPhoneE164 === data.guestPhoneE164,
      );

      if (this.conversationCreateUniqueConflictForPhoneOnce === data.guestPhoneE164) {
        this.conversationCreateUniqueConflictForPhoneOnce = null;

        if (!existing) {
          this.conversations.push({
            id: `conversation-${this.conversations.length + 1}`,
            guestPhoneE164: data.guestPhoneE164,
            reservationId: data.reservationId ?? null,
            unreadCount: 0,
            lastMessageAt: null,
            lastInboundAt: null,
            customerServiceWindowExpiresAt: null,
            createdAt: NOW,
            updatedAt: NOW,
          });
        }

        throw p2002(["guestPhoneE164"]);
      }

      if (existing) {
        throw p2002(["guest_phone_e164"]);
      }

      const created: ConversationRecord = {
        id: `conversation-${this.conversations.length + 1}`,
        guestPhoneE164: data.guestPhoneE164,
        reservationId: data.reservationId ?? null,
        unreadCount: 0,
        lastMessageAt: null,
        lastInboundAt: null,
        customerServiceWindowExpiresAt: null,
        createdAt: NOW,
        updatedAt: NOW,
      };

      this.conversations.push(created);
      return this.toConversationSelect(created);
    },
    update: async (args: unknown) => {
      const input = args as {
        where: { id: string };
        data: {
          unreadCount?: { increment: number };
          lastMessageAt?: Date;
          lastInboundAt?: Date;
          customerServiceWindowStartedAt?: Date;
          customerServiceWindowExpiresAt?: Date;
          reservationId?: string;
        };
      };
      const conversation = this.requireConversation(input.where.id);

      if (input.data.unreadCount) {
        conversation.unreadCount += input.data.unreadCount.increment;
      }
      conversation.lastMessageAt =
        input.data.lastMessageAt ?? conversation.lastMessageAt;
      conversation.lastInboundAt =
        input.data.lastInboundAt ?? conversation.lastInboundAt;
      conversation.customerServiceWindowExpiresAt =
        input.data.customerServiceWindowExpiresAt ??
        conversation.customerServiceWindowExpiresAt;
      conversation.reservationId =
        input.data.reservationId ?? conversation.reservationId;
      conversation.updatedAt = NOW;

      return this.toConversationSelect(conversation);
    },
    updateMany: async (args: unknown) => {
      const input = args as {
        where: { id: string };
        data: { unreadCount?: number };
      };
      const conversation = this.conversations.find(
        (item) => item.id === input.where.id,
      );

      if (!conversation) {
        return { count: 0 };
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
      const providerMessageSid = firstString(
        (args as { where?: { providerMessageSid?: unknown } }).where
          ?.providerMessageSid,
      );
      const message = this.messages.find(
        (item) => item.providerMessageSid === providerMessageSid,
      );

      return message
        ? {
            id: message.id,
            conversationId: message.conversationId,
          }
        : null;
    },
    findMany: async (args: unknown) => {
      const input = args as {
        where?: { conversationId?: unknown };
        orderBy?: Array<{ createdAt?: "asc" | "desc"; id?: "asc" | "desc" }>;
        take?: number;
      };
      const conversationId = firstString(input.where?.conversationId);
      const orderBy = input.orderBy ?? [{ createdAt: "asc" }, { id: "asc" }];

      return this.messages
        .filter((message) => message.conversationId === conversationId)
        .sort((left, right) => {
          for (const order of orderBy) {
            if (order.createdAt) {
              const diff = left.createdAt.getTime() - right.createdAt.getTime();
              if (diff !== 0) {
                return order.createdAt === "desc" ? -diff : diff;
              }
            }

            if (order.id) {
              const diff = left.id.localeCompare(right.id);
              if (diff !== 0) {
                return order.id === "desc" ? -diff : diff;
              }
            }
          }

          return 0;
        })
        .slice(0, input.take ?? this.messages.length);
    },
    create: async (args: unknown) => {
      const data = (args as {
        data: {
          conversationId: string;
          direction: string;
          status: string;
          body?: string | null;
          providerMessageSid?: string | null;
          mediaCount?: number;
          mediaMetadata?: unknown;
          createdAt?: Date;
          updatedAt?: Date;
        };
      }).data;

      if (data.providerMessageSid === this.uniqueConflictForSid) {
        throw p2002(["provider_message_sid"]);
      }

      if (
        data.providerMessageSid &&
        this.messages.some(
          (message) => message.providerMessageSid === data.providerMessageSid,
        )
      ) {
        throw p2002(["providerMessageSid"]);
      }

      const message: MessageRecord = {
        id: `message-${this.messages.length + 1}`,
        conversationId: data.conversationId,
        direction: data.direction,
        status: data.status,
        body: data.body ?? null,
        providerMessageSid: data.providerMessageSid ?? null,
        mediaCount: data.mediaCount ?? 0,
        mediaMetadata: data.mediaMetadata ?? null,
        createdAt: data.createdAt ?? NOW,
        updatedAt: data.updatedAt ?? NOW,
      };

      this.messages.push(message);
      return message;
    },
  };

  staffWhatsAppAlert = {
    create: async () => {
      this.staffAlertCreateCalls += 1;
      throw new Error("UNEXPECTED_STAFF_ALERT_CREATION");
    },
  };

  async $transaction<T>(run: (transaction: this) => Promise<T>): Promise<T> {
    this.transactionAttempts += 1;

    if (this.serializableConflictsRemaining > 0) {
      this.serializableConflictsRemaining -= 1;
      throw serializableConflict();
    }

    return run(this);
  }

  requireConversation(id: string): ConversationRecord {
    const conversation = this.conversations.find((item) => item.id === id);
    assert.ok(conversation, `Missing test conversation ${id}`);
    return conversation;
  }

  toConversationSelect(conversation: ConversationRecord) {
    const reservation =
      this.reservations.find((item) => item.id === conversation.reservationId) ??
      null;

    return {
      ...conversation,
      reservation,
    };
  }

  snapshot(): unknown {
    return {
      conversations: this.conversations,
      messages: this.messages,
      staff: this.staff,
      reservations: this.reservations,
      staffAlertCreateCalls: this.staffAlertCreateCalls,
    };
  }
}

async function processWithFake(
  fake: FakeWhatsAppPrismaClient,
  payload: TwilioWebhookPayload,
  now = NOW,
) {
  return processInboundWhatsAppWebhook(payload, {
    now,
    prismaClient: fake as never,
    source: ENV,
  });
}

function addReservation(
  fake: FakeWhatsAppPrismaClient,
  id: string,
  guestPhone: string | null,
) {
  fake.reservations.push({
    id,
    guestName: `Guest ${id}`,
    guestPhone,
    property: {
      id: `property-${id}`,
      nameEs: `Alojamiento ${id}`,
      nameEn: `Property ${id}`,
    },
  });
}

function addConversation(
  fake: FakeWhatsAppPrismaClient,
  input: Readonly<{
    id: string;
    guestPhoneE164?: string;
    reservationId?: string | null;
  }>,
) {
  fake.conversations.push({
    id: input.id,
    guestPhoneE164: input.guestPhoneE164 ?? "+15005550100",
    reservationId: input.reservationId ?? null,
    unreadCount: 0,
    lastMessageAt: null,
    lastInboundAt: null,
    customerServiceWindowExpiresAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  });
}

function addMessage(
  fake: FakeWhatsAppPrismaClient,
  input: Readonly<{
    id: string;
    conversationId: string;
    createdAt: Date;
    body?: string;
    providerMessageSid?: string;
  }>,
) {
  fake.messages.push({
    id: input.id,
    conversationId: input.conversationId,
    direction: "INBOUND",
    status: "RECEIVED",
    body: input.body ?? input.id,
    providerMessageSid: input.providerMessageSid ?? null,
    mediaCount: 0,
    mediaMetadata: null,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  });
}

function expectPersisted(result: Awaited<ReturnType<typeof processWithFake>>) {
  assert.equal(result.kind, "persisted");
  assert.ok("conversationId" in result);
  assert.ok("messageId" in result);
  return result;
}

test("F.4 persists a valid signed inbound webhook after F.2 signature validation", async () => {
  const fake = new FakeWhatsAppPrismaClient();
  const requestUrl =
    "http://spoofed.example/api/twilio/whatsapp/inbound?source=sandbox";
  const canonicalUrl =
    "https://trp-booking.juantzun.dev/api/twilio/whatsapp/inbound?source=sandbox";
  const body = new URLSearchParams({
    MessageSid: "SM22222222222222222222222222222222",
    From: "whatsapp:+15005550101",
    To: "whatsapp:+15005550006",
    Body: "Mensaje real de huésped",
    NumMedia: "0",
  });
  const validation = await validateTwilioWebhookRequest(
    formRequest(requestUrl, body, canonicalUrl),
    ENV,
  );

  assert.equal(validation.valid, true);
  if (!validation.valid) return;

  const result = expectPersisted(
    await processWithFake(fake, validation.payload),
  );

  assert.equal(fake.conversations.length, 1);
  assert.equal(fake.messages.length, 1);
  assert.equal(result.conversationId, fake.conversations[0].id);
  assert.equal(fake.messages[0].body, "Mensaje real de huésped");
  assert.equal(fake.messages[0].direction, "INBOUND");
  assert.equal(fake.messages[0].status, "RECEIVED");
});

test("F.4 duplicate MessageSid deliveries persist once and increment unread once", async () => {
  const fake = new FakeWhatsAppPrismaClient();
  const payload = makePayload({
    MessageSid: "SM33333333333333333333333333333333",
  });

  expectPersisted(await processWithFake(fake, payload));
  const duplicate = await processWithFake(fake, payload);

  assert.equal(duplicate.kind, "duplicate");
  assert.equal(fake.messages.length, 1);
  assert.equal(fake.conversations[0].unreadCount, 1);
});

test("F.4 provider MessageSid unique conflicts converge without a second side effect", async () => {
  const fake = new FakeWhatsAppPrismaClient();
  const payload = makePayload({
    MessageSid: "SM44444444444444444444444444444444",
  });

  expectPersisted(await processWithFake(fake, payload));
  fake.uniqueConflictForSid = "SM44444444444444444444444444444444";
  const result = await processWithFake(
    fake,
    makePayload({
      MessageSid: "SM44444444444444444444444444444444",
      Body: "retry",
    }),
  );

  assert.equal(result.kind, "duplicate");
  assert.equal(fake.messages.length, 1);
  assert.equal(fake.conversations[0].unreadCount, 1);
});

test("F.4 retries a first-message guestPhoneE164 unique conflict and reuses the winning conversation", async () => {
  const fake = new FakeWhatsAppPrismaClient();
  fake.conversationCreateUniqueConflictForPhoneOnce = "+15005550100";
  addReservation(fake, "reservation-retry", "+1 (500) 555-0100");

  const result = expectPersisted(
    await processWithFake(
      fake,
      makePayload({ MessageSid: messageSid("101") }),
    ),
  );

  assert.equal(fake.transactionAttempts, 2);
  assert.equal(fake.conversations.length, 1);
  assert.equal(fake.messages.length, 1);
  assert.equal(fake.conversations[0].unreadCount, 1);
  assert.equal(fake.conversations[0].reservationId, "reservation-retry");
  assert.equal(result.conversationId, fake.conversations[0].id);
});

test("F.4 converges concurrent first deliveries with the same MessageSid without duplicate side effects", async () => {
  const fake = new FakeWhatsAppPrismaClient();
  const payload = makePayload({
    MessageSid: messageSid("202"),
    Body: "same sid race",
  });

  const results = await Promise.all([
    processWithFake(fake, payload),
    processWithFake(fake, payload),
  ]);
  const resultKinds = results.map((result) => result.kind).sort();

  assert.deepEqual(resultKinds, ["duplicate", "persisted"]);
  assert.equal(fake.conversations.length, 1);
  assert.equal(fake.messages.length, 1);
  assert.equal(fake.conversations[0].unreadCount, 1);
});

test("F.4 converges concurrent first deliveries with different MessageSids into one conversation", async () => {
  const fake = new FakeWhatsAppPrismaClient();

  const results = await Promise.all([
    processWithFake(
      fake,
      makePayload({
        MessageSid: messageSid("303"),
        Body: "first new message",
      }),
    ),
    processWithFake(
      fake,
      makePayload({
        MessageSid: messageSid("304"),
        Body: "second new message",
      }),
    ),
  ]);

  assert.deepEqual(
    results.map((result) => result.kind).sort(),
    ["persisted", "persisted"],
  );
  assert.equal(fake.conversations.length, 1);
  assert.equal(fake.messages.length, 2);
  assert.deepEqual(
    fake.messages.map((message) => message.providerMessageSid).sort(),
    [messageSid("303"), messageSid("304")],
  );
  assert.equal(fake.conversations[0].unreadCount, 2);
});

test("F.4 retries serializable transaction conflicts within the bounded attempt budget", async () => {
  const fake = new FakeWhatsAppPrismaClient();
  fake.serializableConflictsRemaining = 2;

  expectPersisted(
    await processWithFake(
      fake,
      makePayload({ MessageSid: messageSid("405") }),
    ),
  );

  assert.equal(fake.transactionAttempts, 3);
  assert.equal(fake.conversations.length, 1);
  assert.equal(fake.messages.length, 1);
  assert.equal(fake.conversations[0].unreadCount, 1);
});

test("F.4 bounded retry exhaustion propagates the temporary database failure", async () => {
  const fake = new FakeWhatsAppPrismaClient();
  fake.serializableConflictsRemaining = 3;

  await assert.rejects(
    () =>
      processWithFake(
        fake,
        makePayload({ MessageSid: messageSid("406") }),
      ),
    (error) =>
      typeof error === "object" &&
      error !== null &&
      (error as { code?: unknown }).code === "P2034",
  );

  assert.equal(fake.transactionAttempts, 3);
  assert.equal(fake.conversations.length, 0);
  assert.equal(fake.messages.length, 0);
});

test("F.4 reuses one conversation per guest phone and only new messages increment unread", async () => {
  const fake = new FakeWhatsAppPrismaClient();

  expectPersisted(
    await processWithFake(
      fake,
      makePayload({ MessageSid: "SM55555555555555555555555555555555" }),
    ),
  );
  expectPersisted(
    await processWithFake(
      fake,
      makePayload({ MessageSid: "SM66666666666666666666666666666666" }),
    ),
  );
  await processWithFake(
    fake,
    makePayload({ MessageSid: "SM66666666666666666666666666666666" }),
  );

  assert.equal(fake.conversations.length, 1);
  assert.equal(fake.messages.length, 2);
  assert.equal(fake.conversations[0].unreadCount, 2);
});

test("F.4 sets inbound timestamps and the 24-hour customer-service window foundation", async () => {
  const fake = new FakeWhatsAppPrismaClient();

  expectPersisted(await processWithFake(fake, makePayload()));

  assert.equal(fake.conversations[0].lastMessageAt?.toISOString(), NOW.toISOString());
  assert.equal(fake.conversations[0].lastInboundAt?.toISOString(), NOW.toISOString());
  assert.equal(
    fake.conversations[0].customerServiceWindowExpiresAt?.toISOString(),
    WINDOW_EXPIRES.toISOString(),
  );
});

test("F.4 checks active staff phone identity before guest conversation matching", async () => {
  const fake = new FakeWhatsAppPrismaClient();
  fake.staff.push({
    id: "staff-active",
    phoneE164: "+15005550100",
    active: true,
  });
  addReservation(fake, "reservation-1", "+15005550100");

  const result = await processWithFake(fake, makePayload());

  assert.deepEqual(result, {
    kind: "ignored",
    reason: "ACTIVE_STAFF_SENDER",
  });
  assert.equal(fake.conversations.length, 0);
  assert.equal(fake.messages.length, 0);
});

test("F.4 inactive staff phone records do not exclude guest persistence", async () => {
  const fake = new FakeWhatsAppPrismaClient();
  fake.staff.push({
    id: "staff-inactive",
    phoneE164: "+15005550100",
    active: false,
  });

  expectPersisted(await processWithFake(fake, makePayload()));

  assert.equal(fake.conversations.length, 1);
  assert.equal(fake.messages.length, 1);
});

test("F.4 links exactly one normalized Reservation guest phone and fails safe for zero or multiple matches", async () => {
  const exact = new FakeWhatsAppPrismaClient();
  addReservation(exact, "reservation-one", "+1 (500) 555-0100");
  expectPersisted(await processWithFake(exact, makePayload()));
  assert.equal(exact.conversations[0].reservationId, "reservation-one");

  const none = new FakeWhatsAppPrismaClient();
  addReservation(none, "reservation-none", "+15005559999");
  expectPersisted(await processWithFake(none, makePayload()));
  assert.equal(none.conversations[0].reservationId, null);

  const multiple = new FakeWhatsAppPrismaClient();
  addReservation(multiple, "reservation-a", "+15005550100");
  addReservation(multiple, "reservation-b", "+1 500 555 0100");
  expectPersisted(await processWithFake(multiple, makePayload()));
  assert.equal(multiple.conversations[0].reservationId, null);

  assert.equal(normalizeReservationGuestPhone("+1 (500) 555-0100"), "+15005550100");
});

test("F.4 preserves an existing reservation link and does not reassign it", async () => {
  const fake = new FakeWhatsAppPrismaClient();
  fake.conversations.push({
    id: "conversation-existing",
    guestPhoneE164: "+15005550100",
    reservationId: "reservation-original",
    unreadCount: 0,
    lastMessageAt: null,
    lastInboundAt: null,
    customerServiceWindowExpiresAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  });
  addReservation(fake, "reservation-original", "+15005550123");
  addReservation(fake, "reservation-new", "+15005550100");

  expectPersisted(await processWithFake(fake, makePayload()));

  assert.equal(fake.conversations[0].reservationId, "reservation-original");
});

test("F.4 rejects invalid From values and ignores wrong business sender before persistence", async () => {
  const invalid = new FakeWhatsAppPrismaClient();
  const invalidResult = await processWithFake(
    invalid,
    makePayload({ From: "whatsapp:5555-1234" }),
  );

  assert.deepEqual(invalidResult, {
    kind: "ignored",
    reason: "INVALID_PAYLOAD",
  });
  assert.equal(invalid.messages.length, 0);

  const wrongTo = new FakeWhatsAppPrismaClient();
  const wrongToResult = await processWithFake(
    wrongTo,
    makePayload({ To: "whatsapp:+15005559999" }),
  );

  assert.deepEqual(wrongToResult, {
    kind: "ignored",
    reason: "WRONG_BUSINESS_SENDER",
  });
  assert.equal(wrongTo.messages.length, 0);
});

test("F.4 persists text bodies and supports media-only inbound messages without retaining media URLs", async () => {
  const text = new FakeWhatsAppPrismaClient();
  expectPersisted(
    await processWithFake(
      text,
      makePayload({
        Body: "Texto protegido del huésped",
        MessageSid: "SM77777777777777777777777777777777",
      }),
    ),
  );
  assert.equal(text.messages[0].body, "Texto protegido del huésped");

  const mediaOnly = new FakeWhatsAppPrismaClient();
  expectPersisted(
    await processWithFake(
      mediaOnly,
      makePayload({
        Body: undefined,
        MessageSid: "SM88888888888888888888888888888888",
        NumMedia: "1",
        MediaContentType0: "image/jpeg",
        MediaUrl0: "https://api.twilio.com/sensitive/media",
      }),
    ),
  );

  assert.equal(mediaOnly.messages[0].body, null);
  assert.equal(mediaOnly.messages[0].mediaCount, 1);
  assert.deepEqual(mediaOnly.messages[0].mediaMetadata, {
    retainedBytes: false,
    mediaUrlsRetained: false,
    items: [{ index: 0, contentType: "image/jpeg" }],
  });
  assert.equal(
    JSON.stringify(mediaOnly.snapshot()).includes("api.twilio.com/sensitive"),
    false,
  );
});

test("F.4 persisted state never includes raw webhook signatures, Auth Token, or unsafe provider payloads", async () => {
  const fake = new FakeWhatsAppPrismaClient();
  const signature = "raw-signature-that-must-not-persist";
  const payload = makePayload({
    MessageSid: "SM99999999999999999999999999999999",
    Body: "safe persisted guest message",
    MediaUrl0: "https://api.twilio.com/not-retained",
    XTwilioSignature: signature,
  });

  expectPersisted(await processWithFake(fake, payload));

  const persisted = JSON.stringify(fake.snapshot());
  assert.equal(persisted.includes(signature), false);
  assert.equal(persisted.includes(AUTH_TOKEN), false);
  assert.equal(persisted.includes("MediaUrl0"), false);
  assert.equal(persisted.includes("api.twilio.com/not-retained"), false);
});

test("F.4 inbound persistence does not create StaffWhatsAppAlert rows yet", async () => {
  const fake = new FakeWhatsAppPrismaClient();

  expectPersisted(await processWithFake(fake, makePayload()));

  assert.equal(fake.staffAlertCreateCalls, 0);
  assert.equal(
    read("lib/twilio/inbound-whatsapp.ts").includes("staffWhatsAppAlert"),
    false,
  );
});

test("F.4 keeps status callbacks signed ACK-only with no WhatsApp persistence", async () => {
  await withTwilioRouteEnv(async () => {
    const url = "https://trp-booking.juantzun.dev/api/twilio/whatsapp/status";
    const body = new URLSearchParams({
      MessageSid: "SMaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      MessageStatus: "delivered",
      To: "whatsapp:+15005550001",
    });
    const response = await statusPost(formRequest(url, body, url));

    assert.equal(response.status, 204);
    assert.equal(await response.text(), "");
  });

  const statusRoute = read("app/api/twilio/whatsapp/status/route.ts");
  assert.equal(statusRoute.includes("processInboundWhatsAppWebhook"), false);
  assert.equal(statusRoute.includes("whatsAppMessage"), false);
});

test("F.4 mark-read operation explicitly sets unread count to zero and is idempotent", async () => {
  const fake = new FakeWhatsAppPrismaClient();
  expectPersisted(await processWithFake(fake, makePayload()));

  const first = await markAdminWhatsAppConversationRead(
    { conversationId: fake.conversations[0].id },
    { email: "admin@example.com", name: "Admin" },
    { prismaClient: fake as never },
  );
  const second = await markAdminWhatsAppConversationRead(
    { conversationId: fake.conversations[0].id },
    { email: "admin@example.com", name: "Admin" },
    { prismaClient: fake as never },
  );

  assert.equal(first.unreadCount, 0);
  assert.equal(second.unreadCount, 0);
  assert.equal(fake.conversations[0].unreadCount, 0);
});

test("F.4 admin read model exposes the latest 100 messages in stable chronological order", async () => {
  const fake = new FakeWhatsAppPrismaClient();
  addConversation(fake, { id: "conversation-window" });
  const baseTime = Date.parse("2026-09-22T08:00:00.000Z");

  for (let index = 1; index <= 102; index += 1) {
    addMessage(fake, {
      id: `message-${String(index).padStart(3, "0")}`,
      conversationId: "conversation-window",
      createdAt: new Date(baseTime + index * 60_000),
    });
  }

  for (const id of ["message-tie-a", "message-tie-b", "message-tie-c"]) {
    addMessage(fake, {
      id,
      conversationId: "conversation-window",
      createdAt: new Date(baseTime + 200 * 60_000),
    });
  }

  const data = await getAdminWhatsAppPage(
    { conversationId: "conversation-window", page: 1 },
    { prismaClient: fake as never },
  );
  const ids = data.messages.map((message) => message.id);

  assert.equal(data.messages.length, 100);
  assert.deepEqual(ids.slice(0, 3), [
    "message-006",
    "message-007",
    "message-008",
  ]);
  assert.deepEqual(ids.slice(-3), [
    "message-tie-a",
    "message-tie-b",
    "message-tie-c",
  ]);
  assert.equal(ids.includes("message-001"), false);
  assert.equal(ids.includes("message-005"), false);
  assert.equal(ids.includes("message-102"), true);
  assert.equal(ids.includes("message-tie-c"), true);

  for (let index = 1; index < data.messages.length; index += 1) {
    const previous = data.messages[index - 1];
    const current = data.messages[index];
    const previousTime = Date.parse(previous.createdAt);
    const currentTime = Date.parse(current.createdAt);

    assert.ok(
      previousTime < currentTime ||
        (previousTime === currentTime && previous.id < current.id),
    );
  }
});

test("F.4 admin read model exposes safe conversation/message data without provider MessageSid", async () => {
  const fake = new FakeWhatsAppPrismaClient();
  addReservation(fake, "reservation-safe", "+15005550100");
  expectPersisted(await processWithFake(fake, makePayload()));

  const data = await getAdminWhatsAppPage(
    { conversationId: fake.conversations[0].id, page: 1 },
    { prismaClient: fake as never },
  );
  const serialized = JSON.stringify(data);

  assert.equal(data.conversations.length, 1);
  assert.equal(data.selectedConversation?.reservation?.id, "reservation-safe");
  assert.equal(data.messages.length, 1);
  assert.equal(data.messages[0].body, "Hola, necesito ayuda con mi reserva.");
  assert.equal(serialized.includes("SM11111111111111111111111111111111"), false);
});

test("F.4 admin WhatsApp navigation and i18n are centralized, with no reply composer", () => {
  const adminShell = read("features/admin/components/admin-shell.tsx");
  const component = read("features/admin/components/admin-whatsapp-page.tsx");
  const es = read("messages/es.ts");
  const en = read("messages/en.ts");

  assert.equal(adminShell.includes('href: "/admin/whatsapp"'), true);
  assert.equal(adminShell.includes('key: "whatsapp"'), true);
  assert.equal(es.includes("whatsappPage"), true);
  assert.equal(en.includes("whatsappPage"), true);
  assert.equal(component.includes("<textarea"), false);
  assert.equal(component.includes("messages.admin.whatsappPage"), true);
});
