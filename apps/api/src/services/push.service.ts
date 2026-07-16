import { Expo, ExpoPushMessage } from "expo-server-sdk";

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

export async function sendPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<{ sent: string[]; failed: string[] }> {
  const messages: ExpoPushMessage[] = tokens
    .filter((token) => Expo.isExpoPushToken(token))
    .map((token) => ({
      to: token,
      sound: "default",
      title,
      body,
      data,
    }));

  const sent: string[] = [];
  const failed: string[] = [];

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      receipts.forEach((receipt, index) => {
        const token = chunk[index].to as string;
        if (receipt.status === "ok") {
          sent.push(token);
        } else {
          failed.push(token);
        }
      });
    } catch (err) {
      chunk.forEach((message) => failed.push(message.to as string));
    }
  }

  return { sent, failed };
}
