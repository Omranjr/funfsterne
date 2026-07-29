import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Support | Fünf Sterne Friseur",
  description: "Get help with the Fünf Sterne Friseur app.",
};

export default function SupportPage() {
  return (
    <LegalPageShell title="Support" updated="29 July 2026">
      <p>
        Need help with the Fünf Sterne Friseur app, a discount code, or an
        order at one of our branches? Reach us at{" "}
        <a href="mailto:funfsternebymido@gmail.com">
          funfsternebymido@gmail.com
        </a>{" "}
        and we will get back to you as soon as we can.
      </p>

      <h2>Common questions</h2>
      <ul>
        <li>
          <strong>My discount code says it was already redeemed.</strong>{" "}
          Each code can only be redeemed once per device. If you believe this
          is an error, contact us with the code and the approximate date you
          tried to use it.
        </li>
        <li>
          <strong>I&apos;m not receiving notifications.</strong> Check that
          notifications are enabled for the app in your device&apos;s system
          settings, and that you allowed the permission prompt when you first
          opened the app.
        </li>
        <li>
          <strong>I want my device data removed.</strong> See our{" "}
          <a href="/privacy">Privacy Policy</a> for how to request deletion.
        </li>
      </ul>

      <p>
        For anything else, or to report a problem with the app, email us at{" "}
        <a href="mailto:funfsternebymido@gmail.com">
          funfsternebymido@gmail.com
        </a>
        .
      </p>
    </LegalPageShell>
  );
}
