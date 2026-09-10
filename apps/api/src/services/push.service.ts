import { Expo, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

export type SendPushResult = {
  /** Tokens Expo accepted for delivery. NOT tokens that received anything. */
  queued: string[];
  /** Tokens Expo refused outright, plus everything in a chunk that threw. */
  failed: string[];
  /** Ticket ids to look up later, paired with the token they belong to. */
  tickets: { id: string; token: string }[];
  /**
   * Set when the whole send failed before Expo looked at any message --
   * a bad EXPO_ACCESS_TOKEN, or Expo being unreachable. Distinct from
   * per-message failures, and worth showing the admin verbatim: previously
   * this was swallowed and the send simply reported zero recipients.
   */
  transportError?: string;
};

/**
 * Hands messages to Expo and reports what Expo said.
 *
 * The important thing this does NOT do is claim delivery. Expo answers a
 * send with a *ticket* per message, and `status: "ok"` there means only
 * "queued". Whether Apple or Google actually took it appears in a *receipt*
 * fetched minutes later -- see `notification-delivery.service.ts`. Treating
 * a ticket as proof of delivery is what let an APNs `InvalidProviderToken`
 * rejection show up in the dashboard as a successful send to one device.
 */
export async function sendPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<SendPushResult> {
  const valid = tokens.filter((token) => Expo.isExpoPushToken(token));
  const malformed = tokens.filter((token) => !Expo.isExpoPushToken(token));

  const messages: ExpoPushMessage[] = valid.map((token) => ({
    to: token,
    sound: "default",
    title,
    body,
    data,
  }));

  const queued: string[] = [];
  const failed: string[] = [...malformed];
  const tickets: { id: string; token: string }[] = [];
  let transportError: string | undefined;

  for (const chunk of expo.chunkPushNotifications(messages)) {
    try {
      const chunkTickets: ExpoPushTicket[] =
        await expo.sendPushNotificationsAsync(chunk);

      chunkTickets.forEach((ticket, index) => {
        const token = chunk[index].to as string;
        if (ticket.status === "ok") {
          queued.push(token);
          tickets.push({ id: ticket.id, token });
        } else {
          failed.push(token);
        }
      });
    } catch (err) {
      // One bad chunk should not hide the rest, but the reason must not be
      // lost either -- an invalid access token fails every chunk identically
      // and used to surface as a silent "0 recipients".
      transportError =
        err instanceof Error ? err.message : "Unknown push transport error";
      chunk.forEach((message) => failed.push(message.to as string));
    }
  }

  return { queued, failed, tickets, transportError };
}

export type ReceiptOutcome = {
  delivered: number;
  failed: number;
  /** Distinct Expo error codes, e.g. "DeviceNotRegistered". */
  errors: string[];
  /** Tokens Expo says are dead and should be dropped. */
  deadTokens: string[];
};

/**
 * Fetches the real delivery outcome for previously issued tickets.
 *
 * `DeviceNotRegistered` is separated out because it is the one error with an
 * obvious remedy: the app was uninstalled or the token rotated, and the row
 * should go rather than be retried forever.
 */
export async function fetchPushReceipts(
  tickets: { id: string; token: string }[],
): Promise<ReceiptOutcome> {
  const byId = new Map(tickets.map((t) => [t.id, t.token]));
  const out: ReceiptOutcome = {
    delivered: 0,
    failed: 0,
    errors: [],
    deadTokens: [],
  };

  for (const chunk of expo.chunkPushNotificationReceiptIds([...byId.keys()])) {
    const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

    for (const [id, receipt] of Object.entries(receipts)) {
      if (receipt.status === "ok") {
        out.delivered += 1;
        continue;
      }

      out.failed += 1;
      const code = (receipt.details as { error?: string } | undefined)?.error;
      if (code && !out.errors.includes(code)) out.errors.push(code);

      const token = byId.get(id);
      if (code === "DeviceNotRegistered" && token) out.deadTokens.push(token);
    }
  }

  return out;
}
